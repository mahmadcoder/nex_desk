"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireStaff, requireOwnerAdmin } from "@/lib/auth/guards";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { generateDocument } from "@/lib/pdf/generate";
import { asUuid, getSiteBaseUrl, moneyMulti, sumByCurrency, pdfFilename } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";
import { notify } from "@/lib/actions/notify";
import { handoverGate } from "@/lib/delivery/gate";
import { fmtDate } from "@/lib/datetime";

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/* ============================================================
   HANDOVER
   ============================================================ */

/**
 * Everything standing between a project and its handover.
 *
 * The rule itself now lives in `lib/delivery/gate.ts`, shared with the handover
 * PDF and the project page — it decides whether ownership of the work changes
 * hands, and three separate copies of that is two too many.
 *
 * `owing` is kept in the return shape for callers, and is now the outstanding
 * balance on the CONTRACT specifically. It previously counted every payment on
 * the project, so paying for domains and change work drove it to zero and
 * unlocked handover on a project that was still owed for.
 */
async function handoverBlockers(projectId: string) {
  const gate = await handoverGate(projectId);
  return {
    project: gate.project,
    deal: gate.deal,
    owing: gate.contract.outstanding,
    openChanges: gate.openChanges,
    reasons: gate.reasons,
    warnings: gate.warnings,
  };
}

/**
 * Hands a project over — as an event, not a download.
 *
 * The old flow generated the PDF and opened it in a new tab: nothing was
 * recorded, nobody was told, and the button went on inviting you to do it
 * again. This emails the pack to the client, the admin and every assigned
 * staff member, and stamps the project so the button can say so.
 */
export async function handoverProject(projectId: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(projectId);
  if (!id) throw new Error("Invalid project reference.");

  const { project, reasons } = await handoverBlockers(id);
  if (reasons.length) throw new Error(`Handover is locked. ${reasons.join(" ")}`);

  const client = (project.clients as any) ?? null;
  if (!client?.email) throw new Error("This client has no email address on file.");

  // Generated once and reused for all three recipients, so everyone receives
  // byte-identical paperwork.
  const doc = await generateDocument("handover", id, me.userId);
  const attachment = { filename: pdfFilename(doc.title), content: doc.buffer };

  // Everyone who worked on it should know it shipped.
  const { data: assignments } = await db
    .from("client_employee_assignments")
    .select("employees(full_name, email)")
    .eq("client_id", project.client_id);

  const staff = (assignments ?? [])
    .map((a: any) => a.employees)
    .filter((e: any) => e?.email);

  const portalUrl = `${getSiteBaseUrl()}/portal`;

  // The warranty clock starts here. Free fixes cover DEFECTS in what we built;
  // anything new is a change request from day one regardless of this date.
  //
  // Computed once. The email vars and the stored `warranty_ends_on` used to be
  // worked out separately a few lines apart — the same date derived twice.
  //
  // `?? 14` deliberately does NOT catch 0: a deal can be sold with no support
  // at all, and 0 is that answer rather than a missing value.
  const handedOverAt = new Date();
  const warrantyDaysSold = Number(project.warranty_days ?? 14);
  const warrantyEndsOn = new Date(handedOverAt.getTime() + warrantyDaysSold * 864e5)
    .toISOString().slice(0, 10);
  const warrantyEndsLabel = fmtDate(warrantyEndsOn);
  const vars = {
    client_name: client.name,
    project_name: project.name,
    portal_url: portalUrl,
    live_url: project.live_url || portalUrl,
    warranty_days: warrantyDaysSold,
    warranty_ends: warrantyEndsLabel,
    // One sentence rather than two variables in a template with no
    // conditionals — a project sold with no support would otherwise read
    // "we fix free until <today> — 0 days from today".
    warranty_line: warrantyDaysSold > 0
      ? `Anything that turns out to be **broken in what we built** we fix free until **${warrantyEndsLabel}** — ${warrantyDaysSold} days from today, which is when real defects surface once real people start using it. Tell us and we sort it.`
      : "This project was agreed without a support period, so fixes from here are quoted first. Tell us what you have found and we will price it before doing anything.",
    // Handover only unlocks once the contract is paid, so by definition there
    // is nothing left owing on it. Saying so here matters: this is the moment
    // a client expects to hear it, and until now the delivery email talked
    // about warranties and files without ever mentioning the money.
    settled_line:
      "Your account for this project is fully settled — there is nothing further to pay. " +
      "If you ever receive another invoice for it, query it; it would be a mistake on our side.",
    sender_name: me.fullName ?? "Nex Desk",
  };

  const clientRes = await sendEmail({
    templateKey: "project_delivered",
    to: client.email,
    clientId: project.client_id,
    projectId: id,
    actorId: me.userId,
    rawAttachments: [attachment],
    vars,
  });

  await sendEmail({
    templateKey: "admin_project_handover_notice",
    to: await adminNotifyAddress(),
    clientId: project.client_id,
    projectId: id,
    actorId: me.userId,
    rawAttachments: [attachment],
    vars: { ...vars, client_email: client.email },
  }).catch((e) => console.error("Handover admin notice failed:", e));

  const staffResults = await Promise.allSettled(
    staff.map((s: any) =>
      sendEmail({
        templateKey: "staff_project_handover_notice",
        to: s.email,
        clientId: project.client_id,
        projectId: id,
        actorId: me.userId,
        vars: { ...vars, employee_name: s.full_name },
      })
    )
  );
  const staffEmailed = staffResults.filter(
    (r) => r.status === "fulfilled" && r.value?.ok
  ).length;

  const now = handedOverAt;

  await db.from("projects")
    .update({
      status: "delivered",
      delivered_at: now.toISOString(),
      handed_over_at: now.toISOString(),
      warranty_ends_on: warrantyEndsOn,
    })
    .eq("id", id);

  await recordAudit(
    me.userId,
    "project.handover",
    "projects",
    id,
    { client: client.email, staff_notified: staffEmailed }
  );

  revalidatePath(`/${ADMIN}/projects/${id}`);
  revalidatePath(`/${ADMIN}/clients/${project.client_id}`);
  revalidatePath("/portal");

  return {
    ok: clientRes.ok,
    error: clientRes.ok ? undefined : clientRes.error,
    staffEmailed,
    staffTotal: staff.length,
  };
}

/**
 * The thank-you. Deliberately a separate button rather than part of handover —
 * it lands better a few days later, and only the account owner knows when.
 */
export async function sendProjectThankYou(projectId: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(projectId);
  if (!id) throw new Error("Invalid project reference.");

  const { data: project } = await db
    .from("projects").select("*, clients(id, name, email)").eq("id", id).maybeSingle();
  if (!project) throw new Error("Project not found.");
  if (!project.handed_over_at) throw new Error("Hand the project over first.");

  const client = (project.clients as any) ?? null;
  if (!client?.email) throw new Error("This client has no email address on file.");

  const res = await sendEmail({
    templateKey: "project_thank_you",
    to: client.email,
    clientId: project.client_id,
    projectId: id,
    actorId: me.userId,
    vars: {
      client_name: client.name,
      project_name: project.name,
      portal_url: `${getSiteBaseUrl()}/portal`,
      sender_name: me.fullName ?? "Nex Desk",
    },
  });

  if (res.ok) {
    await db.from("projects").update({ thanked_at: new Date().toISOString() }).eq("id", id);
  }

  await recordAudit(
    me.userId,
    "project.thank_you",
    "projects",
    id,
    {}
  );

  revalidatePath(`/${ADMIN}/projects/${id}`);
  return { ok: res.ok, error: res.ok ? undefined : res.error };
}

/* ============================================================
   CHANGE REQUESTS
   ============================================================ */

/**
 * Logs what a client has asked for after the fact.
 *
 * Callable by staff from the admin panel, or by the client themselves from the
 * portal — in which case there is no staff session, so ownership is proven
 * against the signed-in portal user instead.
 */
export async function raiseChangeRequest(data: {
  projectId: string;
  title: string;
  description?: string;
}) {
  const db = createAdminClient();

  const projectId = asUuid(data.projectId);
  if (!projectId) throw new Error("Invalid project reference.");
  if (!data.title?.trim()) throw new Error("Describe what is being asked for.");

  const { data: project } = await db
    .from("projects").select("id, name, client_id, clients(id, name, email, profile_id, lifecycle)")
    .eq("id", projectId).maybeSingle();
  if (!project) throw new Error("Project not found.");

  const client = (project.clients as any) ?? null;

  // This action runs with the service-role key, so ownership has to be proven
  // here or anyone could file a request against any project.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ownsRecord =
    !!user &&
    (client?.profile_id === user.id ||
      client?.email?.toLowerCase() === user.email?.toLowerCase());

  let actorId: string | null = null;
  if (!ownsRecord) {
    const me = await requireStaff();
    actorId = me.userId;
  }

  // A paused account cannot raise new work. The portal hides the form, but
  // hiding a form is not a control — this is the one that counts. Thrown
  // rather than returned to match the rest of this function, whose caller
  // relies on the throw; returning an error object here would be swallowed and
  // the client would be told their request was sent.
  //
  // Staff are exempt: an admin may well be logging a request that arrived by
  // phone from a client they are about to reactivate.
  if (ownsRecord && client?.lifecycle && client.lifecycle !== "active") {
    throw new Error(
      "This account is paused, so new work cannot be requested here. " +
      "Use the button on the portal to ask us to pick things back up."
    );
  }

  const { data: row, error } = await db.from("change_requests").insert({
    project_id: projectId,
    client_id: project.client_id,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    status: "requested",
    raised_by: ownsRecord ? "client" : "admin",
    created_by: actorId,
  }).select().single();
  if (error) throw new Error(error.message);

  await notify({
    kind: "change_request.raised",
    title: `${ownsRecord ? (client?.name ?? "A client") : "Someone"} asked for “${data.title.trim()}”`,
    body: "Quote it before any work starts — an unquoted change is unpaid work.",
    href: `/${ADMIN}/projects/${projectId}`,
    entity: "change_requests",
    entityId: row.id,
    actorLabel: ownsRecord ? (client?.name ?? null) : null,
    actorKind: ownsRecord ? "client" : "staff",
    clientId: project.client_id,
  });

  await recordAudit(actorId, "change_request.raised", "change_requests", row.id, {
    title: data.title.trim(),
    by: ownsRecord ? "client" : "admin",
  });

  await sendEmail({
    templateKey: "admin_change_request_notice",
    to: await adminNotifyAddress(),
    clientId: project.client_id,
    projectId,
    actorId: actorId ?? undefined,
    vars: {
      client_name: client?.name ?? "A client",
      project_name: project.name,
      request_title: row.title,
      request_detail: row.description || "—",
      admin_url: `${getSiteBaseUrl()}/${ADMIN}/projects/${projectId}`,
    },
  }).catch((e) => console.error("Change request notice failed:", e));

  revalidatePath(`/${ADMIN}/projects/${projectId}`);
  revalidatePath("/portal");
  return { ok: true as const, id: row.id };
}

/** Prices a request and sends the client a change order to approve. */
export async function quoteChangeRequest(
  requestId: string,
  quote: { amount: number; currency: string; extraDays?: number; description?: string }
) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(requestId);
  if (!id) throw new Error("Invalid request reference.");
  if (!(Number(quote.amount) > 0)) throw new Error("Enter the amount you are charging.");

  const { data: cr } = await db
    .from("change_requests").select("*, projects(id, name), clients(id, name, email)")
    .eq("id", id).maybeSingle();
  if (!cr) throw new Error("Change request not found.");

  await db.from("change_requests").update({
    quoted_amount: Number(quote.amount),
    currency: quote.currency,
    extra_days: quote.extraDays ?? null,
    description: quote.description?.trim() || cr.description,
    status: "quoted",
    quoted_at: new Date().toISOString(),
  }).eq("id", id);

  const client = (cr.clients as any) ?? null;
  let emailed = false;

  if (client?.email) {
    const res = await sendEmail({
      templateKey: "change_order",
      to: client.email,
      clientId: cr.client_id,
      projectId: cr.project_id,
      actorId: me.userId,
      attach: { type: "change_order", id },
      vars: {
        client_name: client.name,
        project_name: (cr.projects as any)?.name ?? "your project",
        amount: Number(quote.amount).toLocaleString(),
        currency: quote.currency,
        sender_name: me.fullName ?? "Nex Desk",
      },
    });
    emailed = res.ok;
  }

  await recordAudit(
    me.userId,
    "change_request.quote",
    "change_requests",
    id,
    { amount: quote.amount, currency: quote.currency }
  );

  revalidatePath(`/${ADMIN}/projects/${cr.project_id}`);
  revalidatePath("/portal");
  return { ok: true as const, emailed };
}

/**
 * Client accepted the quote: raise the invoice and reopen the project.
 *
 * Handover re-locks automatically — `handoverBlockers` treats an approved or
 * invoiced change request as outstanding until it is paid and completed.
 */
export async function approveChangeRequest(requestId: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(requestId);
  if (!id) throw new Error("Invalid request reference.");

  const { data: cr } = await db
    .from("change_requests").select("*, projects(id, name), clients(id, name, email)")
    .eq("id", id).maybeSingle();
  if (!cr) throw new Error("Change request not found.");
  if (!cr.quoted_amount) throw new Error("Quote this request before approving it.");
  if (["invoiced", "completed"].includes(cr.status)) {
    throw new Error("This change has already been invoiced.");
  }

  const amount = Number(cr.quoted_amount);
  const { data: invNo } = await db.rpc("next_invoice_no");

  // No `stage_index`: this bills a change request, not a stage of the original
  // payment schedule, so it must not collide with the deal's stage invoices.
  const { data: invoice, error: invErr } = await db.from("invoices").insert({
    invoice_no: invNo,
    client_id: cr.client_id,
    project_id: cr.project_id,
    line_items: [{ item: `Change request — ${cr.title}`, qty: 1, price: amount }],
    subtotal: amount, tax_percent: 0, total: amount,
    currency: cr.currency || "USD",
    due_date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    status: "sent",
    notes: `Raised from change request: ${cr.title}`,
  }).select().single();
  if (invErr) throw new Error(invErr.message);

  await db.from("change_requests").update({
    status: "invoiced",
    approved_at: new Date().toISOString(),
    invoice_id: invoice.id,
  }).eq("id", id);

  // Work is starting again, so the project is no longer delivered.
  await db.from("projects")
    .update({ status: "in_progress", handed_over_at: null })
    .eq("id", cr.project_id);

  const client = (cr.clients as any) ?? null;
  let emailed = false;
  if (client?.email) {
    const res = await sendEmail({
      templateKey: "invoice_sent",
      to: client.email,
      clientId: cr.client_id,
      projectId: cr.project_id,
      actorId: me.userId,
      attach: { type: "invoice", id: invoice.id },
      vars: {
        client_name: client.name,
        invoice_no: invoice.invoice_no,
        amount: amount.toLocaleString(),
        currency: invoice.currency,
        due_date: invoice.due_date,
        sender_name: me.fullName ?? "Nex Desk",
      },
    });
    emailed = res.ok;
  }

  await recordAudit(
    me.userId,
    "change_request.approve",
    "change_requests",
    id,
    { invoice_no: invoice.invoice_no, amount }
  );

  revalidatePath(`/${ADMIN}/projects/${cr.project_id}`);
  revalidatePath(`/${ADMIN}/invoices`);
  revalidatePath("/portal");
  return { ok: true as const, emailed, invoiceNo: invoice.invoice_no };
}

/** Marks the extra work done. Handover unlocks once its invoice is also paid. */
export async function completeChangeRequest(requestId: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(requestId);
  if (!id) throw new Error("Invalid request reference.");

  const { data: cr } = await db
    .from("change_requests").select("id, project_id, invoice_id, status").eq("id", id).maybeSingle();
  if (!cr) throw new Error("Change request not found.");

  // Don't let a project be signed off while the client still owes for it.
  if (cr.invoice_id) {
    const { data: inv } = await db
      .from("invoices").select("total, amount_paid").eq("id", cr.invoice_id).maybeSingle();
    if (inv && Number(inv.amount_paid) < Number(inv.total) - 0.01) {
      throw new Error("That change is still unpaid — record the payment first.");
    }
  }

  await db.from("change_requests")
    .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);

  await recordAudit(
    me.userId,
    "change_request.complete",
    "change_requests",
    id,
    {}
  );

  revalidatePath(`/${ADMIN}/projects/${cr.project_id}`);
  revalidatePath("/portal");
  return { ok: true as const };
}

/** Declines a request without deleting the record of it being asked. */
export async function declineChangeRequest(requestId: string, reason?: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(requestId);
  if (!id) throw new Error("Invalid request reference.");

  const { data: cr } = await db
    .from("change_requests").select("project_id, description").eq("id", id).maybeSingle();
  if (!cr) throw new Error("Change request not found.");

  await db.from("change_requests").update({
    status: "declined",
    description: reason?.trim()
      ? `${cr.description ?? ""}\n\nDeclined: ${reason.trim()}`.trim()
      : cr.description,
  }).eq("id", id);

  await recordAudit(
    me.userId,
    "change_request.decline",
    "change_requests",
    id,
    { reason: reason ?? null }
  );

  revalidatePath(`/${ADMIN}/projects/${cr.project_id}`);
  revalidatePath("/portal");
  return { ok: true as const };
}

/** Read-only helper for the project page — why is handover disabled? */
export async function handoverStatus(projectId: string) {
  await requireStaff();
  const id = asUuid(projectId);
  if (!id) return { ready: false, reasons: ["Invalid project reference."] };
  const { reasons } = await handoverBlockers(id);
  return { ready: reasons.length === 0, reasons };
}
