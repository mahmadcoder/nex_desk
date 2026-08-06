import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { getSiteBaseUrl } from "@/lib/utils";
import { decryptSecret } from "@/lib/crypto";
import { recordAudit } from "@/lib/actions/audit";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * Everything that happens once a deal is won: the project, its milestones, one
 * invoice per payment stage, and the emails that carry them.
 *
 * This used to live inside `lockDeal`, which was the only way to win a deal —
 * you built one and locked it in a single motion. Now a deal can also arrive
 * here from the quote pipeline (`lockQuote`), so the work is shared.
 *
 * A plain module, deliberately: it must not be a server action, and it imports
 * nothing from `@/lib/actions` so the two files cannot form a cycle. The
 * caller resolves the portal account and passes it in.
 *
 * IDEMPOTENT. Calling it twice for the same deal must not produce a second
 * project — see the guard below.
 */
export async function provisionLockedDeal(
  deal: any,
  actor: { userId: string; fullName?: string | null },
  clientAcc: any | null,
  options: { sendEmail: boolean } = { sendEmail: true }
) {
  const db = createAdminClient();
  const { payment_schedule, milestones } = deal;

  // Keep the client's billing currency in step with the deal, so the
  // agreement, the invoice and the portal can never end up disagreeing.
  if (deal.currency) {
    await db.from("clients")
      .update({ preferred_currency: deal.currency })
      .eq("id", deal.client_id);
  }

  /* ---------- Project: at most one per deal ------------------------------
   *
   * Stage invoices have always been protected by the unique index on
   * (deal_id, stage_index), but the project insert was unconditional. That was
   * safe only because `lockDeal` was reachable from exactly one form. With a
   * quote that can be marked won — possibly twice, possibly after a failed
   * request was retried — an unguarded insert gives one deal two projects, and
   * the second has no invoices attached, which silently unlocks the handover
   * gate (it measures paid against the project's own invoices).
   * -------------------------------------------------------------------- */
  const { data: existingProject } = await db
    .from("projects").select("id").eq("deal_id", deal.id).maybeSingle();

  let project = existingProject ?? null;

  if (!project) {
    const { data: created, error: projectErr } = await db.from("projects").insert({
      deal_id: deal.id,
      client_id: deal.client_id,
      name: deal.title,
      description: deal.summary,
      status: "not_started",
      start_date: deal.start_date,
      deadline: deal.deadline,
      lead_member: actor.userId,
      // The support period the client actually agreed to, carried across from
      // the deal. Without this line every project silently took the column
      // default of 14 regardless of what was sold and printed on the
      // agreement — which is exactly what happened before 2027-20.
      warranty_days: Number(deal.warranty_days ?? 14),
      // The five things the kickoff email asks for, tickable by the client in
      // their portal and chased by the daily cron until they all arrive.
      kickoff_items: [
        { id: "brand",    label: "Logo & brand files (AI, SVG or high-res PNG)", done: false, done_at: null },
        { id: "content",  label: "Text content for each page, or a rough draft", done: false, done_at: null },
        { id: "imagery",  label: "Photos or product images",                     done: false, done_at: null },
        { id: "access",   label: "Domain & hosting access",                      done: false, done_at: null },
        { id: "accounts", label: "Analytics or social accounts to connect",      done: false, done_at: null },
      ],
    }).select().single();

    if (projectErr) console.error("Could not create the project for", deal.deal_no, projectErr);
    project = created ?? null;

    // Milestones belong to the project's creation, not to the deal's. Seeding
    // them on a re-lock would duplicate the whole timeline.
    const ms = (milestones?.length
      ? milestones
      : (payment_schedule ?? []).map((p: any) => ({ title: p.label, due_date: p.due_on })));

    if (ms.length && project) {
      await db.from("milestones").insert(
        ms.map((m: any, i: number) => ({
          project_id: project!.id,
          title: m.title,
          description: m.description ?? null,
          due_date: m.due_date ?? null,
          sort_order: i,
        }))
      );
    }
  }

  /* ---------- Invoices: one per payment stage ----------------------------
   *
   * Every stage of the agreed payment schedule becomes its own invoice up
   * front. Stage 1 is issued and emailed now; later stages are created as
   * `draft` with their agreed due dates and issued later via `sendInvoice`.
   *
   * Previously only stage 1 was ever invoiced, and nothing anywhere could
   * raise the rest. That made the client portal understate the contract (a
   * $1500 deal showed $750 "billed" and "settled in full" after the advance)
   * and it silently unlocked the handover document, because the handover gate
   * compares paid against *invoiced*.
   * -------------------------------------------------------------------- */
  const stages: any[] = (payment_schedule ?? []).length
    ? payment_schedule
    : [{
        label: "Advance payment",
        amount: (Number(deal.total) * Number(deal.advance_percent ?? 50)) / 100,
        due_on: null,
      }];

  const createdInvoices: any[] = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const amount = Number(stage?.amount ?? 0);
    if (!(amount > 0)) continue;

    const { data: invNo } = await db.rpc("next_invoice_no");

    const { data: invoice, error: invErr } = await db.from("invoices").insert({
      invoice_no: invNo,
      client_id: deal.client_id,
      project_id: project?.id,
      deal_id: deal.id,
      stage_index: i,
      line_items: [{ item: `${deal.title} — ${stage?.label ?? `Stage ${i + 1}`}`, qty: 1, price: amount }],
      // `deals.total` is already tax-inclusive (DealForm adds tax before
      // splitting the schedule), so stage amounts must NOT be taxed again.
      subtotal: amount,
      tax_percent: 0,
      total: amount,
      currency: deal.currency,
      due_date: stage?.due_on
        ?? (i === 0 ? new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) : null),
      // Only the first stage is issued now. The rest wait for their milestone.
      status: i === 0 ? "sent" : "draft",
    }).select().single();

    if (invErr) {
      // 23505 = this stage is already invoiced (a re-lock). Not fatal, and the
      // reason a second call here is safe.
      if (invErr.code !== "23505") {
        console.error(`Could not raise invoice for stage ${i}:`, invErr);
      }
      continue;
    }
    if (invoice) createdInvoices.push(invoice);
  }

  const invoice = createdInvoices.find((v) => v.stage_index === 0) ?? createdInvoices[0] ?? null;

  // Is this their first deal, or are they buying another service? A returning
  // client should not be welcomed as though nothing had happened before.
  const { data: theirDeals } = await db
    .from("deals").select("id, title, total, currency, status").eq("client_id", deal.client_id);

  const otherLocked = (theirDeals ?? []).filter(
    (d) => d.status === "locked" && d.id !== deal.id
  );
  const isAdditionalService = otherLocked.length > 0;

  if (options.sendEmail) {
    const siteUrl = getSiteBaseUrl();
    const portalUrl = clientAcc?.portal_access_token
      ? `${siteUrl}/portal/login?key=${clientAcc.portal_access_token}`
      : `${siteUrl}/portal/login`;

    // Combined position across everything they hold in this currency.
    const combined = [...otherLocked, deal]
      .filter((d) => String(d.currency).toUpperCase() === String(deal.currency).toUpperCase())
      .reduce((s, d) => s + Number(d.total || 0), 0);

    await sendEmail({
      templateKey: isAdditionalService ? "client_service_added" : "deal_locked",
      to: deal.clients.email,
      clientId: deal.client_id,
      projectId: project?.id,
      actorId: actor.userId,
      attach: { type: "agreement", id: deal.id },
      vars: {
        client_name: deal.clients.name,
        project_name: deal.title,
        service_name: deal.title,
        deal_no: deal.deal_no,
        amount: Number(deal.total).toLocaleString(),
        currency: deal.currency,
        service_count: otherLocked.length + 1,
        combined_total: `${deal.currency} ${combined.toLocaleString()}`,
        deadline: deal.deadline ?? "as agreed",
        portal_url: portalUrl,
        sender_name: actor.fullName ?? "Nex Desk",
      },
    });

    // Credentials go in their own email rather than being appended to the
    // portal_url variable — the layout renders a bare URL as a CTA button, so
    // concatenating a password onto it produced garbled output.
    const invitePassword = decryptSecret(clientAcc?.portal_password_preview);
    if (invitePassword) {
      await sendEmail({
        templateKey: "portal_invite",
        to: deal.clients.email,
        clientId: deal.client_id,
        actorId: actor.userId,
        vars: {
          client_name: deal.clients.name,
          project_name: deal.title,
          portal_url: portalUrl,
          client_email: deal.clients.email,
          client_password: invitePassword,
          sender_name: actor.fullName ?? "Nex Desk",
        },
      });
    }

    // Only the issued (stage 1) invoice is emailed. Drafts stay internal until
    // their milestone is reached and you press "Send invoice".
    if (invoice && invoice.status === "sent") {
      await sendEmail({
        templateKey: "invoice_sent",
        to: deal.clients.email,
        clientId: deal.client_id,
        actorId: actor.userId,
        attach: { type: "invoice", id: invoice.id },
        vars: {
          client_name: deal.clients.name,
          invoice_no: invoice.invoice_no,
          amount: Number(invoice.total).toLocaleString(),
          currency: invoice.currency,
          due_date: invoice.due_date,
          sender_name: actor.fullName ?? "Nex Desk",
        },
      });
    }
  }

  // An existing client buying more is the best news the agency gets — say so
  // internally, with the combined position rather than just the new line.
  if (isAdditionalService) {
    const combinedAll = [...otherLocked, deal]
      .filter((d) => String(d.currency).toUpperCase() === String(deal.currency).toUpperCase())
      .reduce((s, d) => s + Number(d.total || 0), 0);

    await sendEmail({
      templateKey: "admin_service_added_notice",
      to: await adminNotifyAddress(),
      clientId: deal.client_id,
      actorId: actor.userId,
      vars: {
        client_name: deal.clients.name,
        service_name: deal.title,
        amount: Number(deal.total).toLocaleString(),
        currency: deal.currency,
        service_count: otherLocked.length + 1,
        combined_total: `${deal.currency} ${combinedAll.toLocaleString()}`,
        admin_url: `${getSiteBaseUrl()}/${ADMIN}/clients/${deal.client_id}`,
      },
    }).catch((e) => console.error("Service-added notice failed:", e));
  }

  // Buying again reactivates a dormant client automatically — nobody should
  // have to remember to flip that by hand.
  await db.from("clients")
    .update({ lifecycle: "active", is_active: true })
    .eq("id", deal.client_id)
    .neq("lifecycle", "active");

  await recordAudit(actor.userId, "deal.lock", "deals", deal.id, {
    total: deal.total,
    project: project?.id,
    invoices: createdInvoices.length,
    additional_service: isAdditionalService,
    // True when a re-lock found the project already there and did nothing —
    // the guard above doing its job, worth being able to see in the log.
    reused_project: !!existingProject,
  });

  revalidatePath(`/${ADMIN}`, "layout");

  return {
    dealId: deal.id,
    projectId: project?.id,
    invoiceId: invoice?.id,
    invoicesCreated: createdInvoices.length,
    isAdditionalService,
  };
}
