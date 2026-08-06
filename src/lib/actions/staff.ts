"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStaff, requireOwnerAdmin } from "@/lib/auth/guards";
import { getCurrentStaff } from "@/lib/auth/staff";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { buildStaffOfferPdf } from "@/lib/pdf/staffDocs";
import { asUuid, getSiteBaseUrl, money } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";
import { notify } from "@/lib/actions/notify";

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/* ============================================================
   COMPENSATION
   ============================================================ */

/**
 * Records money paid to an employee outside the ordinary run of salary.
 *
 * The three kinds behave differently on purpose:
 *
 *   salary_revision — updates the running salary and reissues the offer letter,
 *                     so the document always states what they are actually on.
 *   bonus           — emails the employee and the admin. A bonus nobody is told
 *                     about buys you nothing.
 *   gift            — recorded and silent. An email announcing a gift turns a
 *                     gesture into a transaction, which is worse than nothing.
 */
export async function recordCompensation(data: {
  employeeId: string;
  kind: "salary_revision" | "bonus" | "gift";
  amount: number;
  currency: string;
  effectiveFrom?: string;
  reason?: string;
}) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const employeeId = asUuid(data.employeeId);
  if (!employeeId) throw new Error("Invalid employee reference.");

  const amount = Number(data.amount);
  if (!(amount > 0)) throw new Error("Enter an amount greater than zero.");

  const { data: employee } = await db
    .from("employees").select("*").eq("id", employeeId).maybeSingle();
  if (!employee) throw new Error("Employee not found.");

  const previous = Number(employee.salary_amount ?? 0);

  const { data: row, error } = await db.from("employee_compensation").insert({
    employee_id: employeeId,
    kind: data.kind,
    amount,
    currency: data.currency,
    previous_amount: data.kind === "salary_revision" ? previous : null,
    effective_from: data.effectiveFrom || new Date().toISOString().slice(0, 10),
    reason: data.reason?.trim() || null,
    created_by: me.userId,
  }).select().single();
  if (error) throw new Error(error.message);

  let emailed = false;
  let offerReissued = false;

  if (data.kind === "salary_revision") {
    await db.from("employees")
      .update({ salary_amount: amount, salary_currency: data.currency })
      .eq("id", employeeId);

    // Rebuilt AFTER the update so the attached letter states the new figure.
    let offer: { buffer: Buffer; filename: string } | null = null;
    try {
      const built = await buildStaffOfferPdf(employeeId);
      offer = { buffer: built.buffer, filename: built.filename };
      offerReissued = true;
    } catch (e) {
      console.error("Could not reissue the offer letter:", e);
    }

    if (employee.email) {
      const res = await sendEmail({
        templateKey: "employee_salary_revised",
        to: employee.email,
        actorId: me.userId,
        rawAttachments: offer ? [{ filename: offer.filename, content: offer.buffer }] : undefined,
        vars: {
          employee_name: employee.full_name,
          previous_salary: previous > 0 ? money(previous, employee.salary_currency || data.currency) : "—",
          new_salary: money(amount, data.currency),
          effective_from: data.effectiveFrom || new Date().toISOString().slice(0, 10),
          reason: data.reason?.trim() || "",
          sender_name: me.fullName ?? "Nex Desk",
        },
      });
      emailed = res.ok;
    }
  }

  if (data.kind === "bonus") {
    if (employee.email) {
      const res = await sendEmail({
        templateKey: "employee_bonus",
        to: employee.email,
        actorId: me.userId,
        vars: {
          employee_name: employee.full_name,
          amount: money(amount, data.currency),
          reason: data.reason?.trim() || "",
          sender_name: me.fullName ?? "Nex Desk",
        },
      });
      emailed = res.ok;
    }

    await sendEmail({
      templateKey: "admin_bonus_notice",
      to: await adminNotifyAddress(),
      actorId: me.userId,
      vars: {
        employee_name: employee.full_name,
        amount: money(amount, data.currency),
        reason: data.reason?.trim() || "—",
        employee_url: `${getSiteBaseUrl()}/${ADMIN}/employees/${employeeId}`,
      },
    }).catch((e) => console.error("Bonus admin notice failed:", e));
  }

  // `gift` sends nothing at all, by design.

  await recordAudit(
    me.userId,
    `compensation.${data.kind}`,
    "employees",
    employeeId,
    { amount, currency: data.currency }
  );

  revalidatePath(`/${ADMIN}/employees`);
  revalidatePath(`/${ADMIN}/employees/${employeeId}`);
  return { ok: true as const, id: row.id, emailed, offerReissued };
}

export async function deleteCompensation(id: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const rowId = asUuid(id);
  if (!rowId) throw new Error("Invalid reference.");

  const { data: row } = await db
    .from("employee_compensation").select("employee_id, kind, previous_amount, currency")
    .eq("id", rowId).maybeSingle();
  if (!row) throw new Error("Record not found.");

  // Undoing a raise has to put the old salary back, or the employee row and the
  // history disagree about what they earn.
  if (row.kind === "salary_revision" && row.previous_amount !== null) {
    await db.from("employees")
      .update({ salary_amount: row.previous_amount, salary_currency: row.currency })
      .eq("id", row.employee_id);
  }

  await db.from("employee_compensation").delete().eq("id", rowId);
  await recordAudit(
    me.userId,
    "compensation.delete",
    "employees",
    row.employee_id,
    { kind: row.kind }
  );

  revalidatePath(`/${ADMIN}/employees/${row.employee_id}`);
  return { ok: true as const };
}

/* ============================================================
   LEAVE
   ============================================================ */

/**
 * Approved days taken this calendar year, per leave type.
 *
 * Only approved requests count — a pending request is a plan, not a day off,
 * and counting it would tell someone they had less leave than they really do.
 */
export async function leaveBalances(employeeId: string) {
  await requireStaff();
  const db = createAdminClient();

  const id = asUuid(employeeId);
  if (!id) return [];

  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [{ data: types }, { data: taken }] = await Promise.all([
    db.from("leave_types").select("*").order("sort_order"),
    db.from("leave_requests")
      .select("leave_type, days")
      .eq("employee_id", id)
      .eq("status", "approved")
      .gte("start_date", yearStart),
  ]);

  return (types ?? []).map((t) => {
    const used = (taken ?? [])
      .filter((r) => r.leave_type === t.key)
      .reduce((s, r) => s + Number(r.days || 0), 0);
    return {
      key: t.key,
      label: t.label,
      allowance: Number(t.annual_days || 0),
      used,
      // 0 allowance means "not tracked" (unpaid leave), so there is no remainder.
      remaining: Number(t.annual_days || 0) > 0 ? Math.max(0, Number(t.annual_days) - used) : null,
      isPaid: t.is_paid,
    };
  });
}

/**
 * Files a leave request.
 *
 * A staff member may only ever file against themselves — the employee id is
 * resolved from the session, never taken from the caller, so an employee cannot
 * book leave for a colleague. Owners and admins may file on someone's behalf.
 */
export async function requestLeave(data: {
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  /** Owner/admin only: file on behalf of this employee. */
  employeeId?: string;
}) {
  const me = await getCurrentStaff();
  if (!me) throw new Error("Not signed in.");

  const db = createAdminClient();

  let employeeId = me.employeeId;
  if (data.employeeId && data.employeeId !== me.employeeId) {
    await requireOwnerAdmin();
    employeeId = asUuid(data.employeeId);
  }
  if (!employeeId) {
    throw new Error("Your account is not linked to an employee record. Ask an admin to fix that first.");
  }

  if (!data.startDate || !data.endDate) throw new Error("Pick both dates.");
  if (data.endDate < data.startDate) throw new Error("The end date is before the start date.");
  if (!(Number(data.days) > 0)) throw new Error("How many days is this?");

  // Overlapping requests are almost always a double-submission.
  const { data: clash } = await db
    .from("leave_requests")
    .select("id, start_date, end_date")
    .eq("employee_id", employeeId)
    .in("status", ["pending", "approved"])
    .lte("start_date", data.endDate)
    .gte("end_date", data.startDate)
    .limit(1);

  if (clash?.length) {
    throw new Error(
      `You already have leave booked between ${clash[0].start_date} and ${clash[0].end_date}.`
    );
  }

  const { data: row, error } = await db.from("leave_requests").insert({
    employee_id: employeeId,
    leave_type: data.leaveType,
    start_date: data.startDate,
    end_date: data.endDate,
    days: Number(data.days),
    reason: data.reason?.trim() || null,
    status: "pending",
  }).select("*, employees(full_name, email)").single();
  if (error) throw new Error(error.message);

  const employee = (row.employees as any) ?? null;

  await notify({
    kind: "leave.requested",
    title: `${employee?.full_name ?? "A team member"} requested leave`,
    body: `${data.leaveType ?? "Leave"} · ${data.startDate} to ${data.endDate}`,
    href: `/${ADMIN}/leave`,
    entity: "leave_requests",
    entityId: row.id,
    actorLabel: employee?.full_name ?? null,
    actorKind: "staff",
  });

  await recordAudit(me.userId, "leave.requested", "leave_requests", row.id, {
    from: data.startDate, to: data.endDate,
  });

  await sendEmail({
    templateKey: "admin_leave_request",
    to: await adminNotifyAddress(),
    actorId: me.userId,
    vars: {
      employee_name: employee?.full_name ?? "A staff member",
      leave_type: data.leaveType,
      start_date: data.startDate,
      end_date: data.endDate,
      days: data.days,
      reason: data.reason?.trim() || "—",
      admin_url: `${getSiteBaseUrl()}/${ADMIN}/leave`,
    },
  }).catch((e) => console.error("Leave request notice failed:", e));

  revalidatePath(`/${ADMIN}/leave`);
  revalidatePath(`/${ADMIN}`);
  return { ok: true as const, id: row.id };
}

/** Approve or decline. Both outcomes email the employee — silence is worse. */
export async function decideLeave(
  requestId: string,
  decision: "approved" | "declined",
  note?: string
) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(requestId);
  if (!id) throw new Error("Invalid request reference.");

  const { data: row } = await db
    .from("leave_requests").select("*, employees(full_name, email)").eq("id", id).maybeSingle();
  if (!row) throw new Error("Leave request not found.");
  if (row.status !== "pending") throw new Error("That request has already been decided.");

  await db.from("leave_requests").update({
    status: decision,
    decided_by: me.userId,
    decided_at: new Date().toISOString(),
    decision_note: note?.trim() || null,
  }).eq("id", id);

  const employee = (row.employees as any) ?? null;
  let emailed = false;

  if (employee?.email) {
    const res = await sendEmail({
      templateKey: decision === "approved" ? "leave_approved" : "leave_declined",
      to: employee.email,
      actorId: me.userId,
      vars: {
        employee_name: employee.full_name,
        leave_type: row.leave_type,
        start_date: row.start_date,
        end_date: row.end_date,
        days: row.days,
        note: note?.trim() || "",
        sender_name: me.fullName ?? "Nex Desk",
      },
    });
    emailed = res.ok;
  }

  // Addressed to the one person it concerns, not to the admin stream.
  await notify({
    kind: "leave.decided",
    title: `Your leave was ${decision}`,
    body: `${row.leave_type} · ${row.start_date} to ${row.end_date}${note?.trim() ? ` — ${note.trim()}` : ""}`,
    href: `/${ADMIN}/leave`,
    entity: "leave_requests",
    entityId: id,
    actorLabel: me.fullName ?? null,
    actorKind: "staff",
    employeeId: row.employee_id,
  });

  await recordAudit(
    me.userId,
    `leave.${decision}`,
    "leave_requests",
    id,
    { days: row.days }
  );

  revalidatePath(`/${ADMIN}/leave`);
  revalidatePath(`/${ADMIN}`);
  return { ok: true as const, emailed };
}

/** Withdraws a request. Staff may only cancel their own, and only while pending. */
export async function cancelLeave(requestId: string) {
  const me = await getCurrentStaff();
  if (!me) throw new Error("Not signed in.");

  const db = createAdminClient();
  const id = asUuid(requestId);
  if (!id) throw new Error("Invalid request reference.");

  const { data: row } = await db
    .from("leave_requests").select("employee_id, status").eq("id", id).maybeSingle();
  if (!row) throw new Error("Leave request not found.");

  const isOwn = row.employee_id === me.employeeId;
  if (!isOwn) await requireOwnerAdmin();
  if (isOwn && !me.isPrivileged && row.status !== "pending") {
    throw new Error("That request has already been decided — speak to an admin.");
  }

  await db.from("leave_requests").update({ status: "cancelled" }).eq("id", id);

  revalidatePath(`/${ADMIN}/leave`);
  revalidatePath(`/${ADMIN}`);
  return { ok: true as const };
}

/* ============================================================
   MY OWN PROFILE
   ============================================================ */

/**
 * Sets the signed-in employee's own photo.
 *
 * Until now the only writer of `employees.avatar_url` was `saveEmployee`, which
 * is `requireOwnerAdmin`-guarded — so the photo a client sees in the portal was
 * one the person themselves could neither set nor change.
 *
 * Takes a URL and nothing else. There is deliberately no employee-id parameter:
 * the row is matched on the caller's own `user_id`, so there is no argument
 * that could be pointed at somebody else's record.
 *
 * Returns its error rather than throwing — Next.js strips the message from
 * anything thrown inside a Server Action in production, which arrives at the
 * browser as an anonymous 500.
 */
export async function updateMyPhoto(url: string | null) {
  const me = await requireStaff();
  const db = createAdminClient();

  const clean = String(url ?? "").trim();

  // The upload action used to fall back to a base64 data URL when storage
  // failed, which put megabytes of text in this column. That is fixed at the
  // source, but refusing it here too means a stale client cannot reintroduce it.
  if (clean && !/^https?:\/\//i.test(clean)) {
    return { ok: false as const, error: "That does not look like an uploaded image." };
  }

  // Read before writing. The old version overwrote blind, so the previous photo
  // was lost from the app the instant it was replaced — even though the file
  // itself was still sitting in the bucket.
  const { data: current } = await db
    .from("employees")
    .select("id, full_name, avatar_url")
    .eq("user_id", me.userId)
    .maybeSingle();

  // An owner has no employees row — those are only ever created by the hiring
  // form, and an owner account is made the other way round. Their photo lives
  // on `profiles` instead, which is what that long-dead `avatar_url` column is
  // finally for. No history and no removal request: both exist so a staff
  // member cannot silently pull their face off a client portal, and an owner
  // approving their own request would be theatre.
  if (!current) {
    const { error: profileError } = await db
      .from("profiles")
      .update({ avatar_url: clean || null })
      .eq("id", me.userId);

    if (profileError) {
      console.error("updateMyPhoto (profiles) failed:", profileError);
      return { ok: false as const, error: profileError.message };
    }

    revalidatePath(`/${ADMIN}/profile`);
    revalidatePath(`/${ADMIN}`);
    return { ok: true as const, removalRequested: false };
  }

  const previous: string | null = current.avatar_url ?? null;
  const removing = !clean;

  // A REMOVAL does not clear the column. The photo is on client-facing pages,
  // and it must not come off one silently — so this raises a request an admin
  // answers. Replacing is untouched and still applies immediately; the gate is
  // only on making a face disappear.
  const patch = removing
    ? { avatar_removal_requested_at: new Date().toISOString() }
    : { avatar_url: clean, avatar_removal_requested_at: null };

  const { error } = await db.from("employees").update(patch).eq("user_id", me.userId);

  if (error) {
    // 42703 = undefined column: the 2027-18 migration has not been run.
    console.error("updateMyPhoto failed:", error);
    return {
      ok: false as const,
      error:
        error.code === "42703"
          ? "The photo history columns are missing. Run supabase/idempotent_fixes_2027_18.sql, then try again."
          : error.message,
    };
  }

  // Recorded whether or not the notification and audit below succeed — the
  // history is the point, and neither of those should be able to lose it.
  const { error: histError } = await db.from("employee_photo_history").insert({
    employee_id: current.id,
    photo_url: clean || null,
    previous_url: previous,
    changed_by: me.userId,
    changed_by_self: true,
  });
  if (histError) console.error("updateMyPhoto: history not recorded:", histError);

  // No `employeeId` on purpose — that is what makes this an admins-audience
  // row, which staff can never read (the audience check constraint keeps
  // employee_id NULL, and staff are filtered by employee_id equality).
  await notify({
    kind: "profile.photo",
    title: removing
      ? `${current.full_name} asked to remove their photo`
      : `${current.full_name} changed their profile photo`,
    body: removing
      ? "Their photo is still showing to clients until you decide. Open their profile to take it down or keep it."
      : previous
        ? "Replaced the one that was there before. Every photo they have set is kept on their profile."
        : "They had no photo before this one.",
    href: `/${ADMIN}/employees/${current.id}`,
    entity: "employees",
    entityId: current.id,
    actorLabel: current.full_name,
    actorKind: "staff",
  });

  await recordAudit(me.userId, "employee.photo", "employees", current.id, {
    from: previous,
    to: clean || null,
    removal_requested: removing,
  });

  revalidatePath(`/${ADMIN}/profile`);
  revalidatePath(`/${ADMIN}/employees/${current.id}`);
  revalidatePath(`/${ADMIN}`);
  return { ok: true as const, removalRequested: removing };
}

/**
 * The admin's answer to a removal request.
 *
 * `takeDown` true honours it — the photo comes off everywhere. False keeps the
 * photo and just clears the flag. Either way the decision is recorded, so a
 * staff member who asks twice is visible.
 */
export async function decideMyPhotoRemoval(employeeId: string, takeDown: boolean) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(employeeId);
  if (!id) return { ok: false as const, error: "Invalid employee reference." };

  const { data: employee } = await db
    .from("employees")
    .select("id, full_name, avatar_url, avatar_removal_requested_at")
    .eq("id", id)
    .maybeSingle();

  if (!employee) return { ok: false as const, error: "Employee not found." };
  if (!employee.avatar_removal_requested_at) {
    return { ok: false as const, error: "There is no removal waiting on an answer." };
  }

  const patch = takeDown
    ? { avatar_url: null, avatar_removal_requested_at: null }
    : { avatar_removal_requested_at: null };

  const { error } = await db.from("employees").update(patch).eq("id", id);
  if (error) {
    console.error("decideMyPhotoRemoval failed:", error);
    return { ok: false as const, error: error.message };
  }

  if (takeDown) {
    const { error: histError } = await db.from("employee_photo_history").insert({
      employee_id: id,
      photo_url: null,
      previous_url: employee.avatar_url ?? null,
      changed_by: me.userId,
      changed_by_self: false,
    });
    if (histError) console.error("decideMyPhotoRemoval: history not recorded:", histError);
  }

  await recordAudit(me.userId, "employee.photo_decision", "employees", id, {
    took_down: takeDown,
    was: employee.avatar_url,
  });

  revalidatePath(`/${ADMIN}/employees/${id}`);
  revalidatePath(`/${ADMIN}/employees`);
  return { ok: true as const };
}

/**
 * An admin setting or clearing an employee's photo.
 *
 * Unlike `updateMyPhoto`, removing here removes it — no request, no approval.
 * The Phase-30 gate exists so a *staff member* cannot silently pull their face
 * off a client's portal; an admin doing it deliberately is the decision that
 * gate was deferring to in the first place.
 */
export async function setEmployeePhoto(employeeId: string, url: string | null) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(employeeId);
  if (!id) return { ok: false as const, error: "Invalid employee reference." };

  const clean = String(url ?? "").trim();
  if (clean && !/^https?:\/\//i.test(clean)) {
    return { ok: false as const, error: "That does not look like an uploaded image." };
  }

  const { data: current } = await db
    .from("employees")
    .select("id, full_name, avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (!current) return { ok: false as const, error: "Employee not found." };

  const { error } = await db
    .from("employees")
    .update({
      avatar_url: clean || null,
      // An admin acting on the photo answers any outstanding request by doing so.
      avatar_removal_requested_at: null,
    })
    .eq("id", id);

  if (error) {
    console.error("setEmployeePhoto failed:", error);
    return { ok: false as const, error: error.message };
  }

  const { error: histError } = await db.from("employee_photo_history").insert({
    employee_id: id,
    photo_url: clean || null,
    previous_url: current.avatar_url ?? null,
    changed_by: me.userId,
    changed_by_self: false,
  });
  if (histError) console.error("setEmployeePhoto: history not recorded:", histError);

  await recordAudit(me.userId, "employee.photo", "employees", id, {
    from: current.avatar_url,
    to: clean || null,
    by_admin: true,
  });

  revalidatePath(`/${ADMIN}/employees/${id}`);
  revalidatePath(`/${ADMIN}/employees`);
  return { ok: true as const };
}
