"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { asUuid, getSiteBaseUrl, money } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/* ============================================================
   AGREEMENT ACCEPTANCE
   ============================================================ */

/**
 * The client accepts their agreement in the portal.
 *
 * Asking someone to print, sign, scan and upload is three chances to lose the
 * deal to friction — and a photographed signature proves less than a recorded
 * click. The typed name, timestamp, IP and user agent together are stronger
 * evidence, and it takes five seconds.
 *
 * Ownership is proven against the signed-in portal user, not against anything
 * the browser sends: this runs with the service-role key.
 */
export async function acceptAgreement(dealId: string, typedName: string) {
  const db = createAdminClient();

  const id = asUuid(dealId);
  if (!id) throw new Error("Invalid agreement reference.");
  if (!typedName?.trim()) throw new Error("Type your full name to accept.");

  const { data: deal } = await db
    .from("deals").select("*, clients(id, name, email, profile_id)").eq("id", id).maybeSingle();
  if (!deal) throw new Error("Agreement not found.");
  if (deal.status !== "locked") throw new Error("That agreement is not ready to accept.");
  if (deal.accepted_at) throw new Error("This agreement has already been accepted.");

  const client = (deal.clients as any) ?? null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ownsRecord =
    !!user &&
    (client?.profile_id === user.id ||
      client?.email?.toLowerCase() === user.email?.toLowerCase());
  if (!ownsRecord) throw new Error("Sign in to your portal to accept this agreement.");

  // Behind a proxy the real address is the first entry in x-forwarded-for.
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    null;

  await db.from("deals").update({
    accepted_at: new Date().toISOString(),
    accepted_name: typedName.trim(),
    accepted_ip: ip,
    accepted_ua: h.get("user-agent")?.slice(0, 300) ?? null,
  }).eq("id", id);

  await recordAudit(
    null,
    "deal.accepted",
    "deals",
    id,
    { name: typedName.trim(), deal_no: deal.deal_no }
  );

  await sendEmail({
    templateKey: "admin_agreement_accepted",
    to: await adminNotifyAddress(),
    clientId: deal.client_id,
    vars: {
      client_name: client?.name ?? "The client",
      deal_no: deal.deal_no,
      project_name: deal.title,
      accepted_name: typedName.trim(),
      accepted_at: new Date().toLocaleString(),
      ip: ip ?? "unknown",
      admin_url: `${getSiteBaseUrl()}/${ADMIN}/clients/${deal.client_id}`,
    },
  }).catch((e) => console.error("Acceptance notice failed:", e));

  // Their own copy of what they just agreed to, for their records.
  if (client?.email) {
    await sendEmail({
      templateKey: "client_agreement_accepted",
      to: client.email,
      clientId: deal.client_id,
      attach: { type: "agreement", id },
      vars: {
        client_name: client.name,
        project_name: deal.title,
        deal_no: deal.deal_no,
        amount: money(Number(deal.total), deal.currency),
        accepted_at: new Date().toLocaleString(),
      },
    }).catch((e) => console.error("Acceptance receipt failed:", e));
  }

  revalidatePath("/portal");
  revalidatePath(`/${ADMIN}/clients/${deal.client_id}`);
  return { ok: true as const };
}

/* ============================================================
   RETAINERS
   ============================================================ */

/**
 * Turns a locked deal into a recurring one, or stops it.
 *
 * `retainer_renewal` has existed as a template since launch with no retainer
 * behind it, so monthly SEO and maintenance clients were invoiced by hand or
 * forgotten. The daily cron picks these up on `next_renewal_on`.
 */
export async function setRetainer(
  dealId: string,
  config: { enabled: boolean; cycle?: "monthly" | "quarterly" | "yearly"; nextOn?: string; endsOn?: string }
) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(dealId);
  if (!id) throw new Error("Invalid deal reference.");

  const { data: deal } = await db
    .from("deals").select("id, status, client_id, currency").eq("id", id).maybeSingle();
  if (!deal) throw new Error("Deal not found.");
  if (config.enabled && deal.status !== "locked") {
    throw new Error("Lock the deal before putting it on a retainer.");
  }

  await db.from("deals").update({
    is_retainer: config.enabled,
    billing_cycle: config.enabled ? (config.cycle ?? "monthly") : null,
    // A null next date pauses billing without cancelling the retainer.
    next_renewal_on: config.enabled ? (config.nextOn || null) : null,
    retainer_ends_on: config.enabled ? (config.endsOn || null) : null,
  }).eq("id", id);

  await recordAudit(
    me.userId,
    "deal.retainer",
    "deals",
    id,
    { enabled: config.enabled, cycle: config.cycle ?? null }
  );

  revalidatePath(`/${ADMIN}/clients/${deal.client_id}`);
  revalidatePath(`/${ADMIN}/invoices`);
  return { ok: true as const };
}

/* ============================================================
   DEAL TEMPLATES
   ============================================================ */

/** Saves an existing deal's shape for reuse. Prices and scope, not the client. */
export async function saveDealTemplate(dealId: string, name: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(dealId);
  if (!id) throw new Error("Invalid deal reference.");
  if (!name?.trim()) throw new Error("Give the template a name.");

  const { data: deal } = await db.from("deals").select("*").eq("id", id).maybeSingle();
  if (!deal) throw new Error("Deal not found.");

  const { data: row, error } = await db.from("deal_templates").insert({
    name: name.trim(),
    description: deal.summary,
    currency: deal.currency,
    deliverables: deal.deliverables ?? [],
    payment_schedule: deal.payment_schedule ?? [],
    service_slugs: deal.service_slugs ?? [],
    scope: deal.scope,
    exclusions: deal.exclusions,
    terms: deal.terms,
    duration_days: deal.duration_days,
    revisions_included: deal.revisions_included,
    tax_percent: deal.tax_percent,
    is_retainer: deal.is_retainer ?? false,
    billing_cycle: deal.billing_cycle ?? null,
    created_by: me.userId,
  }).select().single();
  if (error) throw new Error(error.message);

  revalidatePath(`/${ADMIN}/deals`);
  return { ok: true as const, id: row.id };
}

export async function deleteDealTemplate(templateId: string) {
  await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(templateId);
  if (!id) throw new Error("Invalid template reference.");

  await db.from("deal_templates").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/deals`);
  return { ok: true as const };
}

/** Bumps the counter so the most-used templates can sort to the top. */
export async function noteTemplateUsed(templateId: string) {
  await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(templateId);
  if (!id) return { ok: false as const };

  const { data: row } = await db
    .from("deal_templates").select("use_count").eq("id", id).maybeSingle();
  if (row) {
    await db.from("deal_templates")
      .update({ use_count: Number(row.use_count ?? 0) + 1 }).eq("id", id);
  }
  return { ok: true as const };
}
