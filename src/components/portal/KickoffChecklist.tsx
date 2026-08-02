"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, CheckCircle2, Circle } from "lucide-react";
import { toggleKickoffItem } from "@/lib/actions/portal";

type Item = { id: string; label: string; done: boolean; done_at: string | null };

/**
 * The five things we need from the client before real work can start.
 *
 * The kickoff email asked for them and nothing ever tracked the answers, so
 * projects stalled on the client's side while looking like the agency's
 * fault. Tickable here; the team is emailed the moment the last one lands.
 */
export default function KickoffChecklist({
  projectId,
  items,
}: {
  projectId: string;
  items: Item[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  // Once everything is in, the list collapses to a single confirmation line —
  // a completed checklist taking up half the card helps nobody.
  if (allDone) {
    return (
      <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-2.5">
        <CheckCircle2 size={15} className="shrink-0 text-emerald-300" />
        <p className="text-xs text-emerald-200">
          Everything we asked for at kickoff is in — thank you. Nothing on our list is
          waiting on you.
        </p>
      </div>
    );
  }

  const toggle = (item: Item) =>
    start(async () => {
      const res = await toggleKickoffItem(projectId, item.id, !item.done);
      if (!res.ok) {
        toast.error(res.error || "Could not save that.");
        return;
      }
      if (res.allDone) toast.success("That's everything — the team has been told. Thank you!");
      router.refresh();
    });

  return (
    <div className="mt-6 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-bone-50">
          <ClipboardCheck size={15} className="text-amber-300" /> What we still need from you
        </h3>
        <span className="mono-tag text-[11px] text-amber-300">
          {doneCount} of {items.length} received
        </span>
      </div>

      <p className="mt-1.5 text-[11px] leading-relaxed text-bone-300">
        Work moves fastest when these arrive early. Tick each one as you send it — upload
        files in the documents section below, or send them on WhatsApp.
      </p>

      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-ink-800/60 disabled:opacity-60"
              disabled={pending}
              onClick={() => toggle(item)}
            >
              {item.done ? (
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-300" />
              ) : (
                <Circle size={15} className="mt-0.5 shrink-0 text-bone-400" />
              )}
              <span
                className={`text-xs leading-relaxed ${
                  item.done ? "text-bone-400 line-through" : "text-bone-100"
                }`}
              >
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
