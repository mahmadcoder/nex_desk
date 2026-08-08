"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/actions/audit";
import { notify } from "@/lib/actions/notify";
import { getSiteBaseUrl } from "@/lib/utils";
import { getAgency } from "@/lib/agency";
import { intakeFieldsFor } from "@/config/intakeFields";
import { saveClient, checkEmailExists } from "@/lib/actions";
import { saveEmployee } from "@/lib/actions/cms";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * Onboarding intake.
 *
 * The security boundary of this whole feature is one rule: **a public
 * submission never writes to `clients` or `employees`.** It lands in
 * `intake_requests.payload` and waits. Approval is a separate, guarded action
 * that calls the ordinary `saveClient` / `saveEmployee`, so the real write
 * keeps every check it already had.
 */

const MAX_FIELD = 2000;

function describe(error: any) {
  if (error?.code === "42P01") {
    return "Intake needs its table — run supabase/idempotent_fixes_2027_34.sql.";
  }
  return error?.message ?? "Something went wrong.";
}

/* ============================================================
   CREATING A REQUEST (admin)
   ============================================================ */

export async function createIntakeRequest(input: {
  kind: "client" | "staff";
  label?: string | null;
  note?: string | null;
  days?: number;
}) {
  const me = await requireOwnerAdmin();

  const days = Math.min(90, Math.max(1, Number(input.days) || 14));

  const { data, error } = await createAdminClient()
    .from("intake_requests")
    .insert({
      kind: input.kind,
      label: input.label?.trim() || null,
      note: input.note?.trim() || null,
      expires_at: new Date(Date.now() + days * 864e5).toISOString(),
      created_by: me.userId,
    })
    .select("id, token, expires_at")
    .single();

  if (error) return { ok: false as const, error: describe(error) };

  await recordAudit(me.userId, "intake.create", "intake_requests", data.id, { kind: input.kind });
  revalidatePath(`/${ADMIN}/intake`);

  return {
    ok: true as const,
    token: data.token as string,
    url: `${getSiteBaseUrl()}/intake/${data.token}`,
    expiresAt: data.expires_at as string,
    // Returned so the WhatsApp message signs off with whatever Settings says
    // rather than a hardcoded "Nex Desk". The PDF already reads it via
    // `docAgency()`; the copy text used to disagree with the attachment.
    agency: (await getAgency()).name,
  };
}

/* ============================================================
   THE PUBLIC SIDE
   ============================================================ */

/**
 * Look up a request by its token, for the public page.
 *
 * Returns the SAME null for an unknown, expired, already-submitted or revoked
 * token. Distinguishing them tells a stranger which tokens exist, and how many
 * guesses they are away from a live one.
 */
export async function intakeByToken(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;

  const { data, error } = await createAdminClient()
    .from("intake_requests")
    .select("id, token, kind, status, expires_at, note")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;
  if (data.status !== "pending") return null;
  if (new Date(data.expires_at) < new Date()) return null;

  // Only what the form needs. The label, who created it and the payload of any
  // other request are none of a public visitor's business.
  return { kind: data.kind as "client" | "staff", note: data.note as string | null };
}

/**
 * A public submission.
 *
 * Unauthenticated by necessity — the person filling this in has no account yet,
 * which is the entire point. So it is written defensively:
 *
 *  · only keys defined in the intake config are kept, so extra fields posted by
 *    hand are discarded rather than stored
 *  · every value is trimmed and length-capped
 *  · the status flip is conditional on it still being `pending`, which makes
 *    the submission single-use even if two tabs post at once
 *  · nothing is created anywhere else
 */
export async function submitIntake(token: string, values: Record<string, string>) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return { ok: false as const, error: "This link is no longer valid." };
  }

  const db = createAdminClient();
  const { data: row } = await db
    .from("intake_requests")
    .select("id, kind, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!row || row.status !== "pending" || new Date(row.expires_at) < new Date()) {
    return { ok: false as const, error: "This link is no longer valid. Ask us for a new one." };
  }

  const fields = intakeFieldsFor(row.kind as "client" | "staff");

  const payload: Record<string, string> = {};
  for (const f of fields) {
    const v = String(values?.[f.key] ?? "").trim();
    if (v) payload[f.key] = v.slice(0, MAX_FIELD);
  }

  for (const f of fields) {
    if (f.required && !payload[f.key]) {
      return { ok: false as const, error: `${f.label} is needed.` };
    }
  }
  if (payload.email && !payload.email.includes("@")) {
    return { ok: false as const, error: "That email address does not look complete." };
  }

  // Conditional on `pending`: two tabs posting together cannot both win.
  const { data: updated, error } = await db
    .from("intake_requests")
    .update({ payload, status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false as const, error: describe(error) };
  if (!updated) {
    return { ok: false as const, error: "This form has already been sent. Thank you." };
  }

  await notify({
    kind: "lead.new",
    title: `${row.kind === "client" ? "Client" : "Team"} details received — ${payload.name ?? payload.full_name ?? "someone"}`,
    body: "Review and add them in the panel.",
    href: `/${ADMIN}/intake`,
    entity: "intake_requests",
    entityId: row.id,
    actorKind: "client",
  });

  revalidatePath(`/${ADMIN}/intake`);
  return { ok: true as const };
}

/* ============================================================
   APPROVAL (admin)
   ============================================================ */

/**
 * Turn a submission into a real client or employee.
 *
 * This is the only path from public input into the real tables, and it goes
 * through the ordinary guarded actions rather than inserting directly — so
 * everything they do (auth user creation, welcome email, audit, duplicate
 * checks) still happens exactly as it does when typed by hand.
 */
export async function approveIntake(id: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const { data: row } = await db
    .from("intake_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { ok: false as const, error: "That request no longer exists." };
  if (row.approved_id) return { ok: false as const, error: "This one has already been added." };
  if (row.status !== "submitted") {
    return { ok: false as const, error: "Nothing has been submitted against this yet." };
  }

  const p = (row.payload ?? {}) as Record<string, string>;

  // Check the address BEFORE creating anything.
  //
  // `clients.email` has no unique constraint, so without this a second client
  // row is inserted happily and only the portal provisioning fails — and that
  // failure is caught and returned as `credentialsEmailed: false`. The result
  // was a duplicate client with no login and nothing obviously wrong on screen.
  // `employees.email` IS unique, so that path would at least error, but it
  // would error after the row attempt rather than with a sentence anyone can
  // act on.
  if (p.email) {
    const dupe = await checkEmailExists({
      email: p.email,
      target: row.kind === "client" ? "client" : "employee",
    });
    if (dupe.exists) {
      return {
        ok: false as const,
        error: `${dupe.message ?? "That email is already in use."} Open the existing record instead, or ask them for a different address.`,
      };
    }
  }

  try {
    let createdId: string | null = null;

    if (row.kind === "client") {
      const saved: any = await saveClient(null, {
        name: p.name,
        email: p.email,
        phone: p.phone || null,
        company: p.company || null,
        address: p.address || null,
        city: p.city || null,
        country: p.country || null,
        tax_id: p.tax_id || null,
        notes: p.notes || null,
        source: "referral",
      });
      createdId = saved?.id ?? saved?.data?.id ?? null;
    } else {
      const saved: any = await saveEmployee(null, {
        full_name: p.full_name,
        email: p.email,
        phone: p.phone || null,
        city: p.city || null,
        country: p.country || null,
        education: p.education || null,
        // Comma-separated in the form because that is how people type a list.
        skills: p.skills ? p.skills.split(",").map((x) => x.trim()).filter(Boolean) : [],
        // Bank details have no column of their own, so they are kept with the
        // rest of the notes rather than silently dropped on the floor.
        notes: [p.notes, p.bank_details ? `Bank: ${p.bank_details}` : null]
          .filter(Boolean)
          .join("\n\n") || null,
        // Deliberately not from the form. Salary and seniority are agreed, and
        // these defaults are meant to be corrected on the profile.
        job_title: "To be confirmed",
        salary_amount: 0,
      });
      createdId = saved?.id ?? saved?.data?.id ?? null;
    }

    // Checked, not fired and forgotten. `approved_id` is the only thing
    // stopping the same submission being approved twice, so if this write
    // fails the guard was never armed — and the next click makes a second
    // client. Better to say so loudly while the first one is still fresh.
    const { error: markErr } = await db
      .from("intake_requests")
      .update({
        status: "approved",
        approved_id: createdId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (markErr) {
      console.error("approveIntake: created but could not mark approved", markErr);
      return {
        ok: false as const,
        error:
          `They were added, but this request could not be marked done — do not press Add again or you will create a duplicate. Revoke it instead. (${markErr.message})`,
      };
    }

    await recordAudit(me.userId, "intake.approve", "intake_requests", id, {
      kind: row.kind,
      created: createdId,
    });

    revalidatePath(`/${ADMIN}/intake`);
    revalidatePath(`/${ADMIN}/${row.kind === "client" ? "clients" : "employees"}`);
    return { ok: true as const, kind: row.kind as string, createdId };
  } catch (e: any) {
    // The guarded action refused — a duplicate email, most likely. Surfaced
    // rather than swallowed, and the request stays `submitted` so it can be
    // fixed and tried again.
    return { ok: false as const, error: e?.message || "Could not add them. Check for a duplicate email." };
  }
}

export async function revokeIntake(id: string) {
  const me = await requireOwnerAdmin();

  // Only an unused link can be revoked. Without the status guard this action
  // — which is callable directly, not just from the button — would happily
  // mark an already-approved request as revoked and lose the record of who was
  // added from it.
  const { error } = await createAdminClient()
    .from("intake_requests")
    .update({ status: "revoked" })
    .eq("id", id)
    .in("status", ["pending", "submitted"]);

  if (error) return { ok: false as const, error: describe(error) };

  await recordAudit(me.userId, "intake.revoke", "intake_requests", id);
  revalidatePath(`/${ADMIN}/intake`);
  return { ok: true as const };
}

export async function listIntakeRequests() {
  await requireOwnerAdmin();

  const { data, error } = await createAdminClient()
    .from("intake_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (error.code !== "42P01") console.error("listIntakeRequests failed", error);
    return [];
  }
  return data ?? [];
}
