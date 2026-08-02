"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileBarChart, Sparkles, Send } from "lucide-react";
import { draftMonthlyReport, sendMonthlyReport } from "@/lib/actions/reports";
import Modal from "@/components/admin/Modal";

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm focus:border-lime-400 focus:outline-none";

/**
 * The monthly report, drafted by AI and signed off by a human.
 *
 * The AI gathers the last 30 days of shared work logs, per-service metrics and
 * milestones and writes the first version. Nothing sends until the admin has
 * read it, edited it if needed, and pressed the button — the client is reading
 * the agency's word, not a model's.
 */
export default function MonthlyReportButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"drafting" | "editing">("drafting");
  const [draft, setDraft] = useState({ subject: "", body: "" });
  const [stats, setStats] = useState<{ hours: number; entries: number; milestonesDone: number } | null>(null);

  const generate = () => {
    setOpen(true);
    setPhase("drafting");
    start(async () => {
      const res = await draftMonthlyReport(clientId);
      if (!res.ok) {
        toast.error(res.error || "Could not draft the report.");
        setOpen(false);
        return;
      }
      setDraft({ subject: res.subject!, body: res.body! });
      setStats(res.stats);
      setPhase("editing");
    });
  };

  const send = () => {
    start(async () => {
      const res = await sendMonthlyReport(clientId, draft.subject, draft.body);
      if (!res.ok) {
        toast.error(res.error || "The report did not send.");
        return;
      }
      toast.success(`Monthly report sent to ${clientName}.`);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button className="btn h-9 px-4 text-sm" onClick={generate} disabled={pending}>
        <FileBarChart className="mr-1.5 h-3.5 w-3.5 text-lime-400" /> AI monthly report
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        size="lg"
        title="Monthly report"
        eyebrow={clientName}
        description="Drafted from the last 30 days of shared work logs, metrics and milestones. Edit anything before it goes."
        footer={
          phase === "editing" ? (
            <>
              <button className="btn h-10" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </button>
              <button className="btn h-10" onClick={generate} disabled={pending}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Redraft
              </button>
              <button className="btn btn-primary h-10" onClick={send} disabled={pending}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {pending ? "Sending…" : "Send report"}
              </button>
            </>
          ) : undefined
        }
      >
        {phase === "drafting" ? (
          <div className="py-10 text-center">
            <Sparkles className="mx-auto h-6 w-6 animate-pulse text-lime-400" />
            <p className="mt-3 text-sm text-bone-200">Reading the month&rsquo;s work logs…</p>
            <p className="mt-1 text-xs text-bone-300">
              Only entries shared with the client are used — internal notes stay internal.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stats && (
              <div className="flex flex-wrap gap-2">
                {[
                  `${stats.hours.toFixed(1)} hours`,
                  `${stats.entries} log entries`,
                  `${stats.milestonesDone} milestones done`,
                ].map((s) => (
                  <span
                    key={s}
                    className="mono-tag rounded-full border border-lime-400/25 bg-lime-400/10 px-2.5 py-1 text-[11px] leading-none text-lime-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            <div>
              <label className="mono-tag mb-1.5 block">Subject</label>
              <input
                className={field}
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              />
            </div>
            <div>
              <label className="mono-tag mb-1.5 block">Report</label>
              <textarea
                className={`${field} min-h-72 resize-y leading-relaxed`}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-bone-300">
                Sent on the letterhead. <span className="font-mono">##</span> makes a section
                heading, <span className="font-mono">•</span> lines become a callout card. Read
                it before sending — the AI drafts, you sign.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
