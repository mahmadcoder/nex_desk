"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Loader2, RotateCcw, CheckCircle2 } from "lucide-react";
import Modal from "@/components/admin/Modal";
import { money } from "@/lib/utils";
import { fmtDate } from "@/lib/datetime";
import {
  draftCancellation, confirmCancellation, markRefundSent,
  type CancellationDraft,
} from "@/lib/actions/cancellation";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none";

const REASONS = [
  "Client changed their mind",
  "Budget no longer available",
  "Went with someone else",
  "Client went quiet",
  "Scope was not a fit",
  "Cancelled by us",
];

/**
 * Cancelling a project, and agreeing what goes back.
 *
 * The statement is computed but every figure is editable, because a refund is
 * the opening of a conversation rather than a verdict. Nothing is written or
 * emailed until the second, explicit step.
 */
export default function CancelProjectPanel({ project }: { project: any }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<CancellationDraft | null>(null);

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [pct, setPct] = useState(0);
  const [fee, setFee] = useState("0");
  const [refund, setRefund] = useState("0");
  const [emailClient, setEmailClient] = useState(true);
  const [touchedRefund, setTouchedRefund] = useState(false);
  // Waiving is a judgement call — a client worth keeping is sometimes worth
  // more than the fee. Kept separate from the automatic grace window so the
  // banner can tell the two apart.
  const [waiveFee, setWaiveFee] = useState(false);

  const cancelled = !!project.cancelled_at;

  async function load(nextPct?: number, nextFee?: number, waive?: boolean) {
    setLoading(true);
    try {
      const res = await draftCancellation(project.id, {
        progressPct: nextPct,
        outgoingFee: nextFee,
        waiveBookingFee: waive ?? waiveFee,
      });
      if (!res.ok) {
        toast.error(res.error);
        return null;
      }
      setDraft(res.draft);
      if (nextPct === undefined) setPct(res.draft.result.lines.length ? res.draft.suggestedPct : 0);
      // The suggested figure only overwrites the box until it is edited by
      // hand — recalculating must never quietly undo a negotiated number.
      if (!touchedRefund) setRefund(String(res.draft.result.refund));
      return res.draft;
    } finally {
      setLoading(false);
    }
  }

  async function openPanel() {
    setOpen(true);
    const d = await load();
    if (d) {
      setPct(d.suggestedPct);
      setFee(String(d.result.lines.find((l) => l.label.includes("sending"))?.amount ?? 0).replace("-", ""));
    }
  }

  function recalc(nextPct: number, nextFee: string, waive?: boolean) {
    setPct(nextPct);
    setFee(nextFee);
    load(nextPct, Number(nextFee) || 0, waive);
  }

  function submit() {
    if (!reason.trim()) {
      toast.error("Pick or type why it was cancelled.");
      return;
    }
    start(async () => {
      const res = await confirmCancellation({
        projectId: project.id,
        reason,
        refundAmount: Number(refund) || 0,
        refundFee: Number(fee) || 0,
        progressPct: pct,
        notes,
        emailClient,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.emailed
          ? "Cancelled. The client has the settlement in writing."
          : "Cancelled and recorded."
      );
      setOpen(false);
      router.refresh();
    });
  }

  function sent() {
    start(async () => {
      const res = await markRefundSent(project.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Recorded as refunded.");
      router.refresh();
    });
  }

  /* ── Already cancelled: show the settlement, not the form ── */
  if (cancelled) {
    const amount = Number(project.refund_amount ?? 0);
    return (
      <section className="card space-y-3 border-ink-600 p-5">
        <h2 className="flex items-center gap-2 border-b border-ink-700 pb-3 text-base font-semibold text-bone-50">
          <Ban size={16} className="text-rose-400" /> Cancelled
        </h2>

        <p className="text-xs leading-relaxed text-bone-200">
          {project.cancellation_reason}
          <span className="mt-0.5 block text-bone-400">
            {fmtDate(project.cancelled_at)}
            {project.cancel_progress_pct != null &&
              ` · ${project.cancel_progress_pct}% of the work treated as delivered`}
          </span>
        </p>

        <div className="rounded-lg border border-ink-600 bg-ink-800/50 p-3">
          <p className="mono-tag text-[11px]">Refund agreed</p>
          <p className="mt-1 font-mono text-lg text-bone-50">
            {amount > 0 ? money(amount, project.refund_currency || "USD") : "Nothing to return"}
          </p>
          {project.refund_notes && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-bone-300">{project.refund_notes}</p>
          )}
        </div>

        {amount > 0 &&
          (project.refunded_at ? (
            <p className="flex items-center gap-1.5 text-xs text-emerald-300">
              <CheckCircle2 size={13} /> Sent{" "}
              {fmtDate(project.refunded_at)}
            </p>
          ) : (
            <button className="btn w-full justify-center" onClick={sent} disabled={pending}>
              {pending ? "Recording…" : "I have sent the refund"}
            </button>
          ))}
      </section>
    );
  }

  if (project.handed_over_at) return null;

  return (
    <>
      <section className="card space-y-3 border-ink-600 p-5">
        <h2 className="flex items-center gap-2 border-b border-ink-700 pb-3 text-base font-semibold text-bone-50">
          <Ban size={16} className="text-bone-400" /> Cancel this project
        </h2>
        <p className="text-xs leading-relaxed text-bone-300">
          Works out what to refund: what actually reached your account, less the work already
          delivered, less anything spent on their behalf, less the cost of sending it back.
          Nothing is saved until you confirm.
        </p>
        <button className="btn w-full justify-center" onClick={openPanel}>
          Work out the settlement
        </button>
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        size="xl"
        title="Cancel and settle up"
        description="Every figure is editable. The calculation is a starting point, not a verdict."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)} disabled={pending}>
              Keep the project
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={pending || loading}>
              {pending ? "Cancelling…" : "Cancel the project"}
            </button>
          </>
        }
      >
        {loading && !draft ? (
          <p className="flex items-center gap-2 py-8 text-sm text-bone-300">
            <Loader2 size={14} className="animate-spin" /> Working it out…
          </p>
        ) : draft ? (
          <div className="space-y-5">
            {/* Which rule is in play, said plainly before the numbers — the
                figure below only makes sense once you know which one applied. */}
            {draft.bookingFeePct > 0 && (
              <div
                className={`rounded-lg border p-3 text-xs leading-relaxed ${
                  draft.result.graceApplied
                    ? "border-lime-400/25 bg-lime-400/[0.06] text-lime-200"
                    : "border-ink-600 bg-ink-800/50 text-bone-200"
                }`}
              >
                {waiveFee ? (
                  <>
                    <strong>Booking fee waived by you.</strong> Only the work delivered and real
                    costs are being withheld. Say why in the note below — it is the only record.
                  </>
                ) : draft.result.graceApplied ? (
                  <>
                    <strong>Inside the grace window</strong>
                    {draft.graceHoursLeft > 0 && ` — about ${draft.graceHoursLeft} hours left`}, and
                    no work has started. The {draft.bookingFeePct}% booking fee is not charged.
                  </>
                ) : draft.result.bookingFeeApplied ? (
                  <>
                    <strong>The {draft.bookingFeePct}% booking fee applies.</strong>{" "}
                    {draft.workStarted
                      ? "Work has started, so the grace window is closed"
                      : draft.firstPaidOn
                        ? `Paid on ${draft.firstPaidOn}, so the grace window has passed`
                        : "No payment is recorded against this project"}
                    . It is more than the work delivered so far, so it applies instead.
                  </>
                ) : (
                  <>
                    <strong>Work delivered exceeds the booking fee</strong>, so the fee does not
                    apply — they are charged for the work itself.
                  </>
                )}
              </div>
            )}

            {/* ── The statement ── */}
            <div className="rounded-lg border border-ink-600 bg-ink-800/50 p-4">
              <p className="mono-tag mb-3 text-[11px]">Settlement</p>
              <dl className="space-y-2.5">
                {draft.result.lines.map((l, i) => (
                  <div
                    key={i}
                    className={
                      l.kind === "total"
                        ? "border-t border-ink-600 pt-2.5"
                        : ""
                    }
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <dt
                        className={`text-sm ${
                          l.kind === "total" ? "font-semibold text-bone-50" : "text-bone-200"
                        }`}
                      >
                        {l.label}
                      </dt>
                      <dd
                        className={`shrink-0 font-mono text-sm ${
                          l.kind === "total"
                            ? "text-lg font-semibold text-lime-400"
                            : l.amount < 0
                              ? "text-rose-300"
                              : "text-bone-100"
                        }`}
                      >
                        {l.amount < 0 ? "−" : ""}
                        {money(Math.abs(l.amount), draft.currency)}
                      </dd>
                    </div>
                    {l.note && (
                      <p className="mt-0.5 text-[11px] leading-relaxed text-bone-400">{l.note}</p>
                    )}
                  </div>
                ))}
              </dl>
            </div>

            {/* ── The two figures worth arguing about ── */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mono-tag mb-1.5 block text-xs">Work delivered (%)</label>
                <input
                  className={field}
                  type="number"
                  min="0"
                  max="100"
                  value={pct}
                  onChange={(e) => setPct(Number(e.target.value))}
                  onBlur={() => recalc(pct, fee)}
                />
                <p className="mt-1 text-[11px] leading-relaxed text-bone-400">
                  {draft.progressNote}
                  {draft.hoursLogged > 0 && ` ${draft.hoursLogged.toFixed(1)} hours logged.`}
                </p>
              </div>

              <div>
                <label className="mono-tag mb-1.5 block text-xs">Cost to send the refund</label>
                <input
                  className={field}
                  type="number"
                  min="0"
                  step="0.01"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  onBlur={() => recalc(pct, fee)}
                />
                <p className="mt-1 text-[11px] leading-relaxed text-bone-400">
                  Bank or transfer charge on the way back. Comes off the refund.
                </p>
              </div>
            </div>

            {/* The override. Offered only when the fee is actually biting —
                a checkbox to waive something that is not being charged is
                noise. */}
            {draft.result.bookingFeeApplied && !draft.result.graceApplied && (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-ink-600 bg-ink-800/50 p-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-3.5 w-3.5 accent-lime-400"
                  checked={waiveFee}
                  onChange={(e) => {
                    setWaiveFee(e.target.checked);
                    recalc(pct, fee, e.target.checked);
                  }}
                />
                <span className="text-xs leading-relaxed text-bone-200">
                  Waive the {draft.bookingFeePct}% booking fee anyway
                  <span className="block text-[11px] text-bone-400">
                    A client worth keeping is sometimes worth more than the fee. Put the reason
                    in the note below.
                  </span>
                </span>
              </label>
            )}

            {draft.incomingFees === 0 && draft.paidGross > 0 && (
              <p className="rounded-lg border border-amber-400/25 bg-amber-400/[0.07] p-3 text-[11px] leading-relaxed text-amber-200">
                No bank charges are recorded against this client&rsquo;s payments, so the
                calculation assumes every rupee they sent reached you. If the bank took a cut,
                add it to the payment before agreeing this figure.
              </p>
            )}

            {/* ── Why ── */}
            <div>
              <label className="mono-tag mb-1.5 block text-xs">Why is it being cancelled? *</label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                      reason === r
                        ? "border-lime-400/50 bg-lime-400/10 text-lime-300"
                        : "border-ink-600 text-bone-300 hover:border-ink-400"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                className={field}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Or write it in your own words"
              />
            </div>

            {/* ── The agreed number ── */}
            <div>
              <label className="mono-tag mb-1.5 block text-xs">
                Refund you are actually giving ({draft.currency})
              </label>
              <input
                className={field}
                type="number"
                min="0"
                step="0.01"
                value={refund}
                onChange={(e) => {
                  setTouchedRefund(true);
                  setRefund(e.target.value);
                }}
              />
              <p className="mt-1 text-[11px] leading-relaxed text-bone-400">
                {touchedRefund && Number(refund) !== draft.result.refund
                  ? `The calculation says ${money(draft.result.refund, draft.currency)} — you are overriding it, which is fine, but the reason belongs in the note below.`
                  : "Change this if you have agreed something different."}
              </p>
            </div>

            <div>
              <label className="mono-tag mb-1.5 block text-xs">Note to the client (optional)</label>
              <textarea
                className={`${field} min-h-[70px] resize-y`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything that explains the figure, or what happens to the work produced so far."
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-ink-600 bg-ink-800/50 p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 accent-lime-400"
                checked={emailClient}
                onChange={(e) => setEmailClient(e.target.checked)}
                disabled={!draft.clientEmail}
              />
              <span className="text-xs leading-relaxed text-bone-200">
                Email {draft.clientName} the settlement
                <span className="block text-[11px] text-bone-400">
                  {draft.clientEmail
                    ? "The reason, the figure and your note — so it is in writing on both sides."
                    : "This client has no email address on file."}
                </span>
              </span>
            </label>

            <p className="text-[11px] leading-relaxed text-bone-400">
              Cancelling also voids any payment stages that were scheduled but never billed, so
              they stop appearing in your cash-flow forecast.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
