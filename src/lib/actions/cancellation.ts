"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { sendEmail } from "@/lib/email/send";
import { asUuid, money, getSiteBaseUrl } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";
import { calculateRefund, suggestProgress, type RefundResult } from "@/lib/refund";
import { splitInvoices } from "@/lib/billing";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * Cancelling a project, and settling up.
 *
 * Two steps on purpose. `draftCancellation` only reads and calculates — it
 * changes nothing, so the figure can be looked at, argued with and adjusted.
 * `confirmCancellation` is the one that acts.
 *
 * That split matters because a refund figure is the opening of a conversation,
 * not a verdict. A button that cancelled and emailed in one click would be
 * wrong far more often than it was right.
 */

export type CancellationDraft = {
  projectName: string;
  clientName: string;
  clientEmail: string | null;
  currency: string;
  contractValue: number;
  paidGross: number;
  incomingFees: number;
  thirdPartyCosts: number;
  suggestedPct: number;
  progressNote: string;
  hoursLogged: number;
  alreadyCancelled: boolean;
  handedOver: boolean;
  /** The configured booking fee, before any waiver. */
  bookingFeePct: number;
  /** Whether the grace window is currently open for this project. */
  inGracePeriod: boolean;
  /** Hours left in the window, when it is still open. */
  graceHoursLeft: number;
  /** True once anything has been logged or the status has moved off not_started. */
  workStarted: boolean;
  /** The date the client's first payment was made, if any. */
  firstPaidOn: string | null;
  result: RefundResult;
};

/** Reads everything the statement needs. Changes nothing. */
export async function draftCancellation(
  projectId: string,
  overrides?: { progressPct?: number; outgoingFee?: number; waiveBookingFee?: boolean }
): Promise<Result<{ draft: CancellationDraft }>> {
  await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(projectId);
  if (!id) return { ok: false, error: "Invalid project reference." };

  const { data: project } = await db
    .from("projects")
    .select("*, clients(id, name, email), deals(id, total, currency)")
    .eq("id", id)
    .maybeSingle();
  if (!project) return { ok: false, error: "Project not found." };

  const client = (project.clients as any) ?? null;
  const deal = (project.deals as any) ?? null;

  const [{ data: invoices }, { data: milestones }, { data: logs }, { data: expenses }] =
    await Promise.all([
      db.from("invoices")
        .select("id, total, amount_paid, currency, status, deal_id, stage_index")
        .eq("project_id", id),
      db.from("milestones").select("id, is_done").eq("project_id", id),
      db.from("daily_work_logs").select("hours_spent").eq("project_id", id),
      db.from("project_expenses").select("cost, currency").eq("project_id", id),
    ]);

  const invoiceIds = (invoices ?? []).map((i) => i.id);

  // Payments carry the bank fee; invoices do not. `amount` is what the client
  // sent and `fee` is what the bank kept, so the two together give what
  // actually landed.
  const { data: payments, error: payErr } = invoiceIds.length
    ? await db.from("payments")
        .select("amount, fee, currency, paid_on")
        .in("invoice_id", invoiceIds)
        .order("paid_on", { ascending: true })
    : { data: [] as any[], error: null };

  if (payErr) {
    console.error("draftCancellation: could not read payments", payErr);
  }

  const { data: settings } = await db
    .from("settings").select("booking_fee_pct, refund_grace_hours").eq("id", 1).maybeSingle();

  // Missing columns (pre-2027-13) fall back to no fee and no window, which is
  // exactly the pure pro-rata behaviour that shipped before them — so an
  // un-migrated database degrades to the old rules rather than to nonsense.
  const bookingFeePct = Number(settings?.booking_fee_pct ?? 0);
  const graceHours = Number(settings?.refund_grace_hours ?? 0);

  /* ---- Is the grace window still open? -------------------------------
   *
   * The clock runs from `paid_on` — the day the client's money actually left
   * them — and NOT from `created_at`, which is when an admin happened to type
   * the payment in. Starting a goodwill clock from our own admin convenience
   * would quietly shrink the client's window whenever we were slow.
   *
   * `paid_on` is a date, so it is treated as end of that day: the error is up
   * to 24 hours in the client's favour, which is the right direction for a
   * grace period.
   * ------------------------------------------------------------------ */
  const firstPaidOn: string | null = (payments ?? [])[0]?.paid_on ?? null;

  let graceHoursLeft = 0;
  if (firstPaidOn && graceHours > 0) {
    const startsFrom = new Date(`${firstPaidOn}T23:59:59`).getTime();
    const elapsedHours = (Date.now() - startsFrom) / 36e5;
    graceHoursLeft = Math.max(0, Math.round(graceHours - elapsedHours));
  }

  // Work having started closes the window regardless of the clock.
  const workStarted =
    project.status !== "not_started" || (logs ?? []).length > 0;

  const inGracePeriod =
    overrides?.waiveBookingFee === true ||
    (graceHoursLeft > 0 && !workStarted && !!firstPaidOn);

  const currency = String(
    deal?.currency || project.currency || client?.preferred_currency || "USD"
  ).toUpperCase();

  const inCurrency = (rows: any[] = []) =>
    rows.filter((r) => String(r.currency || currency).toUpperCase() === currency);

  const paidGross = inCurrency(payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const incomingFees = inCurrency(payments ?? []).reduce((s, p) => s + Number(p.fee || 0), 0);

  // Only the CONTRACT is being unwound. Extras were their own small
  // agreements and are handled as costs below, not as contract payments.
  const { contract } = splitInvoices(invoices ?? []);
  const contractPaid = inCurrency(contract).reduce((s, i) => s + Number(i.amount_paid || 0), 0);

  // Payments are the better source because only they carry the fee. If none
  // are recorded — a payment logged straight onto an invoice — fall back to
  // the invoice figure rather than reporting nothing was ever paid.
  const gross = paidGross > 0 ? paidGross : contractPaid;

  const thirdPartyCosts = inCurrency(expenses ?? []).reduce((s, x) => s + Number(x.cost || 0), 0);
  const hoursLogged = (logs ?? []).reduce((s, l) => s + Number(l.hours_spent || 0), 0);

  const suggestion = suggestProgress(project, milestones ?? []);
  const progressPct = overrides?.progressPct ?? project.cancel_progress_pct ?? suggestion.pct;
  const outgoingFee = overrides?.outgoingFee ?? Number(project.refund_fee ?? 0);

  const result = calculateRefund({
    contractValue: Number(deal?.total ?? 0),
    currency,
    paidGross: gross,
    incomingFees,
    progressPct,
    thirdPartyCosts,
    outgoingFee,
    bookingFeePct,
    inGracePeriod,
  });

  return {
    ok: true,
    draft: {
      projectName: project.name,
      clientName: client?.name ?? "the client",
      clientEmail: client?.email ?? null,
      currency,
      contractValue: Number(deal?.total ?? 0),
      paidGross: gross,
      incomingFees,
      thirdPartyCosts,
      suggestedPct: suggestion.pct,
      progressNote: suggestion.note,
      hoursLogged,
      alreadyCancelled: !!project.cancelled_at,
      handedOver: !!project.handed_over_at,
      bookingFeePct,
      inGracePeriod,
      graceHoursLeft,
      workStarted,
      firstPaidOn,
      result,
    },
  };
}

/**
 * Cancels the project and records the settlement.
 *
 * The figure passed in is whatever the admin agreed — not necessarily what
 * the calculation suggested. `cancel_progress_pct` is frozen alongside it so
 * the statement can be reproduced later, when the progress bar has moved on.
 */
export async function confirmCancellation(input: {
  projectId: string;
  reason: string;
  refundAmount: number;
  refundFee: number;
  progressPct: number;
  notes?: string | null;
  emailClient: boolean;
}): Promise<Result<{ emailed: boolean }>> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(input.projectId);
  if (!id) return { ok: false, error: "Invalid project reference." };
  if (!input.reason?.trim()) {
    return { ok: false, error: "Say why it was cancelled — it is the only record you will have." };
  }

  const refundAmount = Number(input.refundAmount);
  if (!Number.isFinite(refundAmount) || refundAmount < 0) {
    return { ok: false, error: "Enter a valid refund amount." };
  }

  const { data: project } = await db
    .from("projects")
    .select("*, clients(id, name, email), deals(total, currency)")
    .eq("id", id)
    .maybeSingle();
  if (!project) return { ok: false, error: "Project not found." };

  if (project.handed_over_at) {
    return {
      ok: false,
      error:
        "This project was handed over — the work is delivered and paid for. Raise a refund by hand if you have agreed one.",
    };
  }

  const client = (project.clients as any) ?? null;
  const deal = (project.deals as any) ?? null;
  const currency = String(deal?.currency || "USD").toUpperCase();

  const { error } = await db.from("projects").update({
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    cancellation_reason: input.reason.trim(),
    refund_amount: refundAmount,
    refund_currency: currency,
    refund_fee: Number(input.refundFee) || 0,
    refund_notes: input.notes?.trim() || null,
    cancel_progress_pct: Math.round(Number(input.progressPct) || 0),
  }).eq("id", id);

  if (error) {
    console.error("confirmCancellation failed:", error);
    return {
      ok: false,
      error:
        error.code === "42703"
          ? "The cancellation columns are missing — run supabase/idempotent_fixes_2027_12.sql."
          : error.message,
    };
  }

  // Draft stage invoices are scheduled billing for work that will now never
  // happen. Leaving them would keep them in the cash-flow forecast forever.
  const { data: voided } = await db.from("invoices")
    .update({ status: "void" })
    .eq("project_id", id)
    .eq("status", "draft")
    .select("id");

  let emailed = false;
  if (input.emailClient && client?.email) {
    const res = await sendEmail({
      templateKey: "refund_cancellation",
      to: client.email,
      clientId: project.client_id,
      projectId: id,
      actorId: me.userId,
      vars: {
        client_name: client.name,
        project_name: project.name,
        reason: input.reason.trim(),
        refund_amount: money(refundAmount, currency),
        work_done: `${Math.round(Number(input.progressPct) || 0)}%`,
        settlement_note: input.notes?.trim() || "",
        portal_url: `${getSiteBaseUrl()}/portal`,
        sender_name: me.fullName ?? "Nex Desk",
      },
    });
    emailed = res.ok;
    if (!emailed) console.error("Cancellation email failed:", res);
  }

  await recordAudit(me.userId, "project.cancelled", "projects", id, {
    reason: input.reason.trim(),
    refund: refundAmount,
    currency,
    progress_pct: input.progressPct,
    invoices_voided: voided?.length ?? 0,
  });

  revalidatePath(`/${ADMIN}/projects/${id}`);
  revalidatePath(`/${ADMIN}/clients/${project.client_id}`);
  revalidatePath(`/${ADMIN}/forecast`);
  revalidatePath("/portal");

  return { ok: true, emailed };
}

/** Records that the money actually went back. Separate from agreeing it. */
export async function markRefundSent(projectId: string): Promise<Result> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(projectId);
  if (!id) return { ok: false, error: "Invalid project reference." };

  const { error } = await db.from("projects")
    .update({ refunded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await recordAudit(me.userId, "project.refunded", "projects", id, {});
  revalidatePath(`/${ADMIN}/projects/${id}`);
  return { ok: true };
}
