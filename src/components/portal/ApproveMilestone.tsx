"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ThumbsUp, BadgeCheck, MessageSquarePlus, RefreshCw, X } from "lucide-react";
import { approveMilestone, requestMilestoneRevision } from "@/lib/actions/portal";
import { fmtDate } from "@/lib/datetime";

interface ApproveMilestoneProps {
  milestoneId: string;
  milestoneTitle?: string;
  approvedAt: string | null;
  revisionNotes?: string | null;
  revisionRequestedAt?: string | null;
}

export default function ApproveMilestone({
  milestoneId,
  milestoneTitle,
  approvedAt,
  revisionNotes,
  revisionRequestedAt,
}: ApproveMilestoneProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [feedback, setFeedback] = useState("");

  if (approvedAt) {
    return (
      <span className="mono-tag inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-1 text-[10px] leading-none text-emerald-300">
        <BadgeCheck size={12} /> Approved {fmtDate(approvedAt)}
      </span>
    );
  }

  if (revisionRequestedAt && !approvedAt) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="mono-tag inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[10px] leading-none text-amber-300 cursor-pointer hover:bg-amber-500/25 transition-colors"
          title={revisionNotes ? `Feedback: ${revisionNotes}` : "Revision in progress"}
          onClick={() => setShowRevisionModal(true)}
        >
          <RefreshCw size={11} className="animate-spin-slow" /> Revisions Requested
        </span>
      </div>
    );
  }

  const handleApprove = () => {
    start(async () => {
      const res = await approveMilestone(milestoneId);
      if (!res.ok) {
        toast.error(res.error || "Could not record milestone approval.");
        return;
      }
      toast.success("Milestone approved! The team has been notified. Thank you.");
      router.refresh();
    });
  };

  const handleSubmitRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      return toast.error("Please enter your revision notes or feedback.");
    }

    start(async () => {
      const res = await requestMilestoneRevision(milestoneId, feedback.trim());
      if (!res.ok) {
        toast.error(res.error || "Could not submit revision request.");
        return;
      }
      toast.success("Revision request sent! The project team is reviewing your notes.");
      setShowRevisionModal(false);
      setFeedback("");
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          className="mono-tag inline-flex shrink-0 items-center gap-1 rounded-full border border-lime-400/40 bg-lime-400/15 px-2.5 py-1 text-[10px] leading-none text-lime-300 transition-colors hover:bg-lime-400/25 disabled:opacity-60 cursor-pointer"
          disabled={pending}
          title="Confirm and approve this completed milestone"
          onClick={handleApprove}
        >
          <ThumbsUp size={11} /> {pending ? "Saving…" : "Approve"}
        </button>

        <button
          className="mono-tag inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] leading-none text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-60 cursor-pointer"
          disabled={pending}
          title="Request adjustments or tweaks"
          onClick={() => setShowRevisionModal(true)}
        >
          <MessageSquarePlus size={11} /> Request Tweak
        </button>
      </div>

      {/* Revision Feedback Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 border-ink-600 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setShowRevisionModal(false)}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-bone-400 hover:text-bone-100 transition-colors p-1"
            >
              <X size={18} />
            </button>

            <span className="mono-tag text-xs text-amber-400 font-semibold block mb-1">
              Milestone Feedback &amp; Revisions
            </span>
            <h3 className="text-lg font-semibold text-bone-50">
              {milestoneTitle ? `Feedback for “${milestoneTitle}”` : "Request Milestone Revision"}
            </h3>
            <p className="mt-1 text-xs text-bone-400 leading-relaxed">
              Tell the design &amp; engineering team what needs adjustment. Your feedback will be sent directly to your assigned project lead.
            </p>

            {revisionNotes && (
              <div className="mt-3 rounded-lg border border-ink-600 bg-ink-900/90 p-3 text-xs text-bone-300">
                <span className="mono-tag text-[10px] text-bone-400 block mb-1">Previously submitted feedback:</span>
                {revisionNotes}
              </div>
            )}

            <form onSubmit={handleSubmitRevision} className="mt-4 space-y-4">
              <div>
                <label className="mono-tag block text-xs mb-1.5 text-bone-300">
                  What would you like changed or refined?
                </label>
                <textarea
                  rows={4}
                  required
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g. Please update the hero section button color to blue, and ensure the mobile navigation closes after clicking a link."
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 p-3 text-sm text-bone-100 placeholder:text-bone-600 focus:border-amber-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="btn h-9 text-xs px-4"
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || !feedback.trim()}
                  className="btn h-9 text-xs px-4 font-semibold border-amber-500/50 bg-amber-500 text-black hover:bg-amber-400 cursor-pointer"
                >
                  {pending ? "Submitting…" : "Send to Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
