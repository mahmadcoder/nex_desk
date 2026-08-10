"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { sendEmail } from "@/lib/email/send";
import { asUuid, getSiteBaseUrl, money } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";
import { provisionLockedDeal } from "@/lib/deals/provision";
import { ensureClientPortalAccount } from "@/lib/actions";
import { aiComplete } from "@/lib/ai";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * The quote pipeline.
 *
 * `deal_status` has had a 'sent' value since launch that nothing ever wrote:
 * a deal was built and locked in one motion, so there was no state for "the
 * quote is out, waiting on them". These actions give a deal a second exit —
 * send it, chase it, then either win it or record why it was lost.
 *
 * Locking directly still works exactly as before. Quoting is another door,
 * not a new step, because plenty of work is agreed on a call.
 *
 * Errors are RETURNED, never thrown: Next.js strips thrown Server Action
 * messages in production, and a silent failure on a form that just emailed a
 * client is the worst outcome available.
 */

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

/** How long a quotation stands before it needs re-pricing. */
const QUOTE_VALID_DAYS = 14;

const dayOffset = (n: number) =>
  new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

/**
 * Sends a deal to the client as a quotation.
 *
 * Takes the same payload shape as `lockDeal`, so `DealForm` can offer this as
 * a second button without a second form. Re-sending a revised quote through
 * here resets the follow-up cadence, which is correct — the clock restarts
 * when the numbers change.
 */
export async function sendQuote(
  dealData: any
): Promise<Result<{ dealId: string; dealNo: string; emailed: boolean }>> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const { deliverables, payment_schedule, milestones: _milestones, ...rest } = dealData;

  if (!asUuid(rest.client_id)) return { ok: false, error: "Pick a client first." };
  if (!rest.title?.trim()) return { ok: false, error: "Give the quote a title." };

  const { data: deal, error } = await db.from("deals").upsert({
    ...rest,
    deliverables,
    payment_schedule,
    status: "sent",
    quote_sent_at: new Date().toISOString(),
    quote_expires_on: dayOffset(QUOTE_VALID_DAYS),
    // A revised quote is a fresh conversation, so the chase count restarts.
    followup_count: 0,
    last_followup_at: null,
    // Re-quoting something previously written off clears the loss.
    lost_at: null,
    lost_reason: null,
  }).select("*, clients(*)").single();

  if (error || !deal) {
    console.error("sendQuote failed:", error);
    return {
      ok: false,
      error:
        error?.code === "42703"
          ? "The quote columns are missing — run supabase/idempotent_fixes_2027_07.sql."
          : error?.message || "Could not save that quote.",
    };
  }

  const client = (deal.clients as any) ?? null;
  let emailed = false;

  if (client?.email) {
    const res = await sendEmail({
      templateKey: "quotation_sent",
      to: client.email,
      clientId: deal.client_id,
      actorId: me.userId,
      // The PDF goes out once, with the quote itself. Follow-ups deliberately
      // carry no attachment — see the cron sweep.
      attach: { type: "quotation", id: deal.id },
      vars: {
        client_name: client.name,
        project_name: deal.title,
        deal_no: deal.deal_no,
        amount: Number(deal.total).toLocaleString(),
        currency: deal.currency,
        valid_until: deal.quote_expires_on,
        sender_name: me.fullName ?? "Nex Desk",
      },
    });
    emailed = res.ok === true;
    if (!emailed) console.error("Quotation email failed:", res);
  }

  if (deal.client_id) {
    const { data: clientObj } = await db.from("clients").select("lead_id").eq("id", deal.client_id).maybeSingle();
    if (clientObj?.lead_id) {
      await db.from("leads").update({ status: "quoted" }).eq("id", clientObj.lead_id);
      revalidatePath(`/${ADMIN}/leads`);
    }
  }

  await recordAudit(me.userId, "deal.quote_sent", "deals", deal.id, {
    deal_no: deal.deal_no,
    total: deal.total,
    currency: deal.currency,
    emailed,
  });

  revalidatePath(`/${ADMIN}/deals`);
  revalidatePath(`/${ADMIN}/clients/${deal.client_id}`);
  return { ok: true, dealId: deal.id, dealNo: deal.deal_no, emailed };
}

/**
 * Chases an open quote by hand, now, rather than waiting for the cron.
 *
 * Stamps `last_followup_at` so the automatic sweep does not double up on the
 * same morning, and counts towards the same cadence — chasing manually should
 * shorten the automatic sequence, not run alongside it.
 */
export async function resendQuote(
  dealId: string,
  note?: string
): Promise<Result<{ emailed: boolean }>> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(dealId);
  if (!id) return { ok: false, error: "Invalid deal reference." };

  const { data: deal } = await db
    .from("deals").select("*, clients(name, email)").eq("id", id).maybeSingle();
  if (!deal) return { ok: false, error: "That deal no longer exists." };
  if (deal.status !== "sent") {
    return { ok: false, error: "Only an open quote can be chased." };
  }

  const client = (deal.clients as any) ?? null;
  if (!client?.email) return { ok: false, error: "That client has no email address on file." };

  const daysSince = deal.quote_sent_at
    ? Math.floor((Date.now() - new Date(deal.quote_sent_at).getTime()) / 864e5)
    : 0;

  const res = await sendEmail({
    templateKey: "quotation_followup",
    to: client.email,
    clientId: deal.client_id,
    actorId: me.userId,
    vars: {
      client_name: client.name,
      project_name: deal.title,
      deal_no: deal.deal_no,
      amount: money(Number(deal.total), deal.currency),
      currency: deal.currency,
      days_since: daysSince,
    },
    // An edited or AI-drafted note replaces the stock body entirely.
    ...(note?.trim() ? { bodyOverride: note.trim() } : {}),
  });

  if (!res.ok) return { ok: false, error: "The follow-up could not be sent. Try again." };

  await db.from("deals").update({
    followup_count: Number(deal.followup_count ?? 0) + 1,
    last_followup_at: new Date().toISOString(),
  }).eq("id", id);

  await recordAudit(me.userId, "deal.quote_chased", "deals", id, {
    deal_no: deal.deal_no,
    manual: true,
    days_since: daysSince,
  });

  revalidatePath(`/${ADMIN}/deals`);
  return { ok: true, emailed: true };
}

/**
 * The client said yes.
 *
 * Flips the quote to locked and runs the same provisioning as `lockDeal` —
 * project, milestones, stage invoices, agreement email. Safe to call twice:
 * `provisionLockedDeal` reuses an existing project rather than creating a
 * second one.
 */
export async function lockQuote(
  dealId: string
): Promise<Result<{ projectId?: string; invoicesCreated: number }>> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(dealId);
  if (!id) return { ok: false, error: "Invalid deal reference." };

  const { data: deal, error } = await db
    .from("deals").select("*, clients(*)").eq("id", id).maybeSingle();
  if (error || !deal) return { ok: false, error: "That deal no longer exists." };

  if (deal.status === "locked") {
    return { ok: false, error: "This deal is already locked." };
  }
  if (!["draft", "sent"].includes(deal.status)) {
    return { ok: false, error: `A ${deal.status} deal cannot be locked. Re-quote it first.` };
  }

  const daysToClose = deal.quote_sent_at
    ? Math.round((Date.now() - new Date(deal.quote_sent_at).getTime()) / 864e5)
    : null;

  const { data: locked, error: lockErr } = await db.from("deals").update({
    status: "locked",
    locked_at: new Date().toISOString(),
    locked_by: me.userId,
    lost_at: null,
    lost_reason: null,
  }).eq("id", id).select("*, clients(*)").single();

  if (lockErr || !locked) {
    return { ok: false, error: lockErr?.message || "Could not lock that deal." };
  }

  let clientAcc: any = null;
  try {
    clientAcc = await ensureClientPortalAccount(locked.client_id);
  } catch (e) {
    console.error("Portal account provision error on lockQuote:", e);
  }

  const result = await provisionLockedDeal(
    { ...locked, payment_schedule: locked.payment_schedule, milestones: null },
    me,
    clientAcc,
    { sendEmail: true }
  );

  await recordAudit(me.userId, "deal.won", "deals", id, {
    deal_no: locked.deal_no,
    total: locked.total,
    currency: locked.currency,
    days_to_close: daysToClose,
    followups: locked.followup_count ?? 0,
  });

  revalidatePath(`/${ADMIN}/deals`);
  return { ok: true, projectId: result.projectId, invoicesCreated: result.invoicesCreated };
}

/**
 * The client said no.
 *
 * A reason is required. It is the cheapest column in the schema and the only
 * thing that makes a win rate worth reading — "too expensive" three times in a
 * row is a pricing decision, not bad luck.
 *
 * Recorded as `cancelled` + `lost_at` rather than a new enum value: Postgres
 * will not let a newly added enum value be referenced in the same transaction
 * that adds it, which the migration would need to do.
 */
export async function markQuoteLost(
  dealId: string,
  reason: string
): Promise<Result> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(dealId);
  if (!id) return { ok: false, error: "Invalid deal reference." };
  if (!reason?.trim()) {
    return { ok: false, error: "Say why it was lost — it is the only way the win rate means anything." };
  }

  const { data: deal } = await db
    .from("deals").select("id, deal_no, status, total, currency, client_id").eq("id", id).maybeSingle();
  if (!deal) return { ok: false, error: "That deal no longer exists." };

  // A locked deal has a project, milestones and invoices behind it. Walking
  // away from that is a cancellation with money to unwind, not a lost quote.
  if (deal.status === "locked") {
    return {
      ok: false,
      error: "This deal is locked and has a project behind it. Cancel the project instead of marking the quote lost.",
    };
  }

  const { error } = await db.from("deals").update({
    status: "cancelled",
    lost_at: new Date().toISOString(),
    lost_reason: reason.trim(),
  }).eq("id", id);

  if (error) return { ok: false, error: error.message };

  await recordAudit(me.userId, "deal.lost", "deals", id, {
    deal_no: deal.deal_no,
    total: deal.total,
    currency: deal.currency,
    reason: reason.trim(),
  });

  revalidatePath(`/${ADMIN}/deals`);
  revalidatePath(`/${ADMIN}/clients/${deal.client_id}`);
  return { ok: true };
}

/**
 * Drafts the follow-up note. Returns text for the admin to read and edit —
 * it never sends anything by itself.
 */
export async function draftFollowupNote(
  dealId: string
): Promise<Result<{ text: string }>> {
  await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(dealId);
  if (!id) return { ok: false, error: "Invalid deal reference." };

  const { data: deal } = await db
    .from("deals")
    .select("title, summary, total, currency, quote_sent_at, followup_count, clients(name, company)")
    .eq("id", id)
    .maybeSingle();
  if (!deal) return { ok: false, error: "That deal no longer exists." };

  const client = (deal.clients as any) ?? null;
  const daysSince = deal.quote_sent_at
    ? Math.floor((Date.now() - new Date(deal.quote_sent_at).getTime()) / 864e5)
    : 0;

  const res = await aiComplete(
    `Write in plain, confident English for a software agency called Nex Desk. ` +
      `Short sentences. No buzzwords, no exclamation marks, no emoji. British spelling is fine. ` +
      `Output ONLY the email body — no subject line, no preamble, no quotes, no markdown.\n\n` +
      `You are chasing a quotation that has had no reply. Be genuinely low-pressure: ` +
      `offer to adjust the scope or the budget rather than pushing for a yes, and make it ` +
      `easy to say no. Under 120 words. End with "Best regards" and no name.\n\n` +
      `client name: ${client?.name ?? "the client"}\n` +
      `company: ${client?.company ?? "—"}\n` +
      `project: ${deal.title}\n` +
      `summary: ${deal.summary ?? "—"}\n` +
      `quoted: ${money(Number(deal.total), deal.currency)}\n` +
      `days since the quote went out: ${daysSince}\n` +
      `chases already sent: ${deal.followup_count ?? 0}`
  );

  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, text: res.text };
}

/**
 * Everything the pipeline page needs that cannot be read straight off a row:
 * the historical close rate, shown only once there is enough history for it to
 * mean anything.
 */
export async function pipelineStats(): Promise<{
  won: number;
  lost: number;
  closeRate: number | null;
  avgDaysToClose: number | null;
}> {
  await requireOwnerAdmin();
  const db = createAdminClient();

  const since = new Date(Date.now() - 365 * 864e5).toISOString();

  const [{ data: wonRows }, { count: lostCount }] = await Promise.all([
    db.from("deals")
      .select("quote_sent_at, locked_at")
      .eq("status", "locked")
      .gte("locked_at", since),
    db.from("deals")
      .select("id", { count: "exact", head: true })
      .not("lost_at", "is", null)
      .gte("lost_at", since),
  ]);

  const won = wonRows?.length ?? 0;
  const lost = lostCount ?? 0;
  const closed = won + lost;

  // Below five closed deals a percentage is noise dressed as a number.
  const closeRate = closed >= 5 ? won / closed : null;

  // Only deals that were actually quoted have a meaningful time-to-close;
  // one locked straight off a phone call would report zero days and drag the
  // average down.
  const quoted = (wonRows ?? []).filter((d) => d.quote_sent_at && d.locked_at);
  const avgDaysToClose = quoted.length
    ? Math.round(
        quoted.reduce(
          (s, d) =>
            s + (new Date(d.locked_at!).getTime() - new Date(d.quote_sent_at!).getTime()) / 864e5,
          0
        ) / quoted.length
      )
    : null;

  return { won, lost, closeRate, avgDaysToClose };
}
