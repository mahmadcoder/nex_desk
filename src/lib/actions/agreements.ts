"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { asUuid, getSiteBaseUrl, money } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";
import { notify } from "@/lib/actions/notify";
import { fmtDateTime } from "@/lib/datetime";

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

  await notify({
    kind: "agreement.accepted",
    title: `${client?.name ?? "A client"} accepted ${deal.deal_no}`,
    body: `Signed as “${typedName.trim()}”. The advance invoice can go out.`,
    href: `/${ADMIN}/deals/${id}`,
    entity: "deals",
    entityId: id,
    actorLabel: client?.name ?? null,
    actorKind: "client",
    clientId: deal.client_id,
  });

  await sendEmail({
    templateKey: "admin_agreement_accepted",
    to: await adminNotifyAddress(),
    clientId: deal.client_id,
    vars: {
      client_name: client?.name ?? "The client",
      deal_no: deal.deal_no,
      project_name: deal.title,
      accepted_name: typedName.trim(),
      accepted_at: fmtDateTime(),
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
        accepted_at: fmtDateTime(),
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
    warranty_days: deal.warranty_days ?? 14,
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

/* ============================================================
   WHAT WE ARE ACTUALLY WORKING ON
   ============================================================ */

/**
 * Changes which services a deal covers.
 *
 * `deals.service_slugs` is the ONLY place a project's services live — neither
 * `clients` nor `projects` has a service column. Until now nothing could edit
 * it: `DealForm` only ever appended a slug as a side effect of adding a
 * deliverable, no screen rendered the list, and a locked deal did not show it
 * at all.
 *
 * That was not cosmetic. This array decides which questions staff get in Daily
 * Work Logs (`daily-logs/page.tsx:87-95`), so a wrong value gave the wrong log
 * fields forever with nowhere to correct it.
 *
 * **Editable even after lock, and deliberately so.** Services are a
 * categorisation, not a financial term — nothing here touches the total, the
 * payment schedule or any invoice, so the signed PDF the client holds stays
 * true. Money keeps its existing routes: the cancellation panel for refunds, a
 * change request for extra work.
 */
export async function updateDealServices(dealId: string, slugs: string[]) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(dealId);
  if (!id) return { ok: false as const, error: "Invalid deal reference." };

  const next = [...new Set(slugs.map((s) => String(s).trim()).filter(Boolean))].sort();

  const { data: deal } = await db
    .from("deals")
    .select("id, deal_no, title, service_slugs, client_id, clients(name, email)")
    .eq("id", id)
    .maybeSingle();

  if (!deal) return { ok: false as const, error: "Deal not found." };

  const before = [...new Set(((deal.service_slugs as string[]) ?? []).filter(Boolean))].sort();
  const added = next.filter((s) => !before.includes(s));
  const removed = before.filter((s) => !next.includes(s));

  if (!added.length && !removed.length) return { ok: true as const, changed: false };

  const { error } = await db.from("deals").update({ service_slugs: next }).eq("id", id);
  if (error) {
    console.error("updateDealServices failed:", error);
    return {
      ok: false as const,
      // 42703 = undefined column: the 2027-03 migration has not been run.
      error:
        error.code === "42703"
          ? "The service_slugs column is missing. Run supabase/idempotent_fixes_2027_03.sql, then try again."
          : error.message,
    };
  }

  // Pretty names for the email, from the catalogue rather than raw slugs.
  const { data: catalogue } = await db
    .from("services")
    .select("slug, title")
    .in("slug", [...added, ...removed].length ? [...added, ...removed] : ["__none__"]);

  const nameOf = (slug: string) =>
    catalogue?.find((c) => c.slug === slug)?.title ??
    slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  await recordAudit(me.userId, "deal.services", "deals", id, { from: before, to: next, added, removed });

  await notify({
    kind: "agreement.accepted",
    title: `Services updated on ${deal.deal_no}`,
    body: [
      added.length ? `Added: ${added.map(nameOf).join(", ")}` : null,
      removed.length ? `Removed: ${removed.map(nameOf).join(", ")}` : null,
    ].filter(Boolean).join(" · "),
    href: `/${ADMIN}/deals/${id}`,
    entity: "deals",
    entityId: id,
    clientId: deal.client_id,
  });

  const client = deal.clients as any;
  let emailed = false;

  if (client?.email) {
    const lines = [
      ...added.map((s) => `• Added: ${nameOf(s)}`),
      ...removed.map((s) => `• No longer included: ${nameOf(s)}`),
    ].join("\n");

    const sent = await sendEmail({
      templateKey: "services_updated",
      to: client.email,
      clientId: deal.client_id,
      actorId: me.userId,
      vars: {
        client_name: client.name ?? "there",
        project_name: deal.title,
        changes: lines,
        still_included: next.length ? next.map(nameOf).join(", ") : "nothing yet",
        portal_url: `${getSiteBaseUrl()}/portal`,
      },
    });
    emailed = sent.ok;
    if (!sent.ok) console.error("updateDealServices: client email failed:", sent.error);
  }

  revalidatePath(`/${ADMIN}/deals/${id}`);
  revalidatePath(`/${ADMIN}/clients/${deal.client_id}`);
  revalidatePath(`/${ADMIN}/daily-logs`);
  return { ok: true as const, changed: true, added, removed, emailed };
}
