"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trophy, XCircle, Send, Sparkles, Loader2 } from "lucide-react";
import Modal from "@/components/admin/Modal";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { lockQuote, markQuoteLost, resendQuote, draftFollowupNote } from "@/lib/actions/quotes";
import { fmtDate } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none";

/**
 * The three things you do to an open quote: win it, lose it, or chase it.
 *
 * Reasons are required on a loss. It is the cheapest column in the schema and
 * the only thing that makes the win rate worth reading — "too expensive" three
 * times running is a pricing decision, not bad luck.
 */
const LOST_REASONS = [
  "Too expensive",
  "Went with someone else",
  "Timing was wrong",
  "Project cancelled on their side",
  "Went quiet — never answered",
  "Scope was not a fit",
];

export default function QuoteActions({
  deal,
}: {
  deal: any;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [lostOpen, setLostOpen] = useState(false);
  const [chaseOpen, setChaseOpen] = useState(false);
  const [confirmWin, setConfirmWin] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [drafting, setDrafting] = useState(false);

  const isOpen = deal.status === "sent";
  const isLost = !!deal.lost_at;

  function win() {
    start(async () => {
      const res = await lockQuote(deal.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Won. Project created and ${res.invoicesCreated} invoice${res.invoicesCreated === 1 ? "" : "s"} raised.`
      );
      setConfirmWin(false);
      if (res.projectId) {
        router.push(`/${process.env.NEXT_PUBLIC_ADMIN_PATH || "nx-control"}/projects/${res.projectId}`);
      } else {
        router.refresh();
      }
    });
  }

  function lose() {
    if (!reason.trim()) {
      toast.error("Pick or type a reason — it is the only way the win rate means anything.");
      return;
    }
    start(async () => {
      const res = await markQuoteLost(deal.id, reason);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Recorded as lost.");
      setLostOpen(false);
      router.refresh();
    });
  }

  function chase() {
    start(async () => {
      const res = await resendQuote(deal.id, note);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Follow-up sent.");
      setChaseOpen(false);
      setNote("");
      router.refresh();
    });
  }

  async function draft() {
    setDrafting(true);
    try {
      const res = await draftFollowupNote(deal.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setNote(res.text);
    } finally {
      setDrafting(false);
    }
  }

  if (deal.status === "locked") {
    return (
      <div className="rounded-lg border border-lime-400/25 bg-lime-400/[0.06] p-3.5">
        <p className="mono-tag text-[11px] text-lime-300">Won</p>
        <p className="mt-1 text-xs leading-relaxed text-bone-200">
          Locked on {fmtDate(deal.locked_at)}
          {deal.quote_sent_at && (
            <>
              {" "}— {Math.round(
                (new Date(deal.locked_at).getTime() - new Date(deal.quote_sent_at).getTime()) / 864e5
              )} days after the quote went out
            </>
          )}
          . The project and its invoices are live.
        </p>
      </div>
    );
  }

  if (isLost) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-rose-400/25 bg-rose-400/[0.06] p-3.5">
          <p className="mono-tag text-[11px] text-rose-300">Lost</p>
          <p className="mt-1 text-xs leading-relaxed text-bone-200">
            {deal.lost_reason}
            <span className="mt-0.5 block text-bone-400">
              Recorded {fmtDate(deal.lost_at)}
            </span>
          </p>
        </div>
        <p className="text-[11px] leading-relaxed text-bone-400">
          Changed their mind? Edit the figures above and send it again — re-quoting clears the
          loss and restarts the follow-ups.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isOpen && (
        <div className="rounded-lg border border-ink-600 bg-ink-800/50 p-3.5">
          <p className="mono-tag text-[11px]">Quote is out</p>
          <p className="mt-1 text-xs leading-relaxed text-bone-300">
            Sent {fmtDate(deal.quote_sent_at)} ·{" "}
            {deal.followup_count ?? 0} of 3 chases sent
            {deal.quote_expires_on && <> · valid until {deal.quote_expires_on}</>}
          </p>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="btn btn-primary justify-center gap-1.5"
          onClick={() => setConfirmWin(true)}
          disabled={pending}
        >
          <Trophy size={14} /> They said yes
        </button>
        <button
          type="button"
          className="btn justify-center gap-1.5"
          onClick={() => setLostOpen(true)}
          disabled={pending}
        >
          <XCircle size={14} /> Mark lost
        </button>
      </div>

      {isOpen && (
        <button
          type="button"
          className="btn w-full justify-center gap-1.5"
          onClick={() => setChaseOpen(true)}
          disabled={pending}
        >
          <Send size={14} /> Chase it now
        </button>
      )}

      <ConfirmModal
        isOpen={confirmWin}
        onClose={() => setConfirmWin(false)}
        pending={pending}
        isDanger={false}
        title="Mark this quote won?"
        confirmText="Yes — lock it in"
        description="Creates the project and its milestones, raises the payment-stage invoices, and emails the agreement with the advance invoice. Running this twice is safe: it will reuse the project rather than create a second one."
        onConfirm={win}
      />

      {/* ── Lost ─────────────────────────────────────────────── */}
      <Modal
        open={lostOpen}
        onClose={() => setLostOpen(false)}
        pending={pending}
        title="Why was it lost?"
        description="Recorded against the deal and counted in the win rate. Three of the same reason in a row is telling you something."
        footer={
          <>
            <button type="button" className="btn" onClick={() => setLostOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={lose} disabled={pending}>
              {pending ? "Saving…" : "Record it"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {LOST_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
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
            placeholder="Or write it in their words"
          />
        </div>
      </Modal>

      {/* ── Chase ────────────────────────────────────────────── */}
      <Modal
        open={chaseOpen}
        onClose={() => setChaseOpen(false)}
        pending={pending}
        size="lg"
        title="Chase this quote"
        description="Sends now and counts towards the automatic sequence, so it will not be chased twice this week."
        footer={
          <>
            <button type="button" className="btn" onClick={() => setChaseOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={chase} disabled={pending}>
              {pending ? "Sending…" : "Send follow-up"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="mono-tag text-xs">Your note (optional)</label>
            <button
              type="button"
              onClick={draft}
              disabled={drafting}
              className="btn btn-sm gap-1.5"
            >
              {drafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {drafting ? "Drafting…" : "Draft with AI"}
            </button>
          </div>
          <textarea
            className={`${field} min-h-[160px] resize-y`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Leave this empty to send the standard follow-up, or write your own."
          />
          <p className="text-[11px] leading-relaxed text-bone-400">
            No attachment goes with a chase — the client already has the quotation, and
            re-attaching it would put a duplicate in their portal every time.
          </p>
        </div>
      </Modal>
    </div>
  );
}
