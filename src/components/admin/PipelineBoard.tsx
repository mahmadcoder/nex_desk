"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, Trophy, XCircle } from "lucide-react";
import { updateLead } from "@/lib/actions";
import { fmtDate } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE = `/${process.env.NEXT_PUBLIC_ADMIN_PATH || "nx-control"}`;

/**
 * The pipeline, as columns.
 *
 * Nothing new is stored: these are the `lead_status` values the list page has
 * always filtered on. The board is a second view of the same column, for the
 * question a list cannot answer — where is everything stuck.
 *
 * `won` and `lost` are outcomes and sit outside the flow: a lead leaves the
 * board rather than living in a fifth column forever.
 */
const STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "quoted", label: "Quoted" },
] as const;

const ORDER = STAGES.map((s) => s.key);

const AGE_TONE = (days: number) =>
  days >= 14 ? "text-rose-300" : days >= 7 ? "text-amber-300" : "text-bone-500";

export default function PipelineBoard({ leads }: { leads: any[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const set = (id: string, status: string) =>
    start(async () => {
      try {
        await updateLead(id, { status });
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message ?? "Could not move that.");
      }
    });

  const daysOld = (iso: string) => Math.floor((Date.now() - +new Date(iso)) / 864e5);

  return (
    <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
      {STAGES.map((col, colIdx) => {
        const items = leads.filter((l) => l.status === col.key);

        return (
          <section key={col.key} className="w-[85vw] shrink-0 snap-start sm:w-[70vw] lg:w-auto">
            <h2 className="mono-tag mb-3">
              {col.label} <span className="text-bone-500">({items.length})</span>
            </h2>

            <div className="space-y-2.5">
              {items.map((l) => {
                const age = daysOld(l.created_at);
                return (
                  <article key={l.id} className="card p-3.5">
                    <Link
                      href={`${BASE}/leads`}
                      className="text-sm font-medium text-bone-100 hover:text-lime-400"
                    >
                      {l.name}
                    </Link>
                    {l.company && <p className="mono-tag text-[10px]">{l.company}</p>}

                    <div className="mt-2 space-y-0.5 text-[11px] text-bone-400">
                      <p className="truncate">{l.email}</p>
                      {l.budget_range && <p>{l.budget_range}</p>}
                      {/* Age is the point of a board. A lead sitting in
                          Contacted for three weeks is the thing a list of
                          rows hides. */}
                      <p className={AGE_TONE(age)}>
                        {age === 0 ? "today" : `${age} day${age === 1 ? "" : "s"} old`}
                        {" · "}
                        {fmtDate(l.created_at)}
                      </p>
                      {l.utm_source && <p className="text-bone-500">via {l.utm_source}</p>}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-ink-700 pt-2.5">
                      <button
                        type="button"
                        disabled={pending || colIdx === 0}
                        onClick={() => set(l.id, ORDER[colIdx - 1])}
                        aria-label="Move back"
                        className="rounded p-1 text-bone-500 hover:bg-ink-800 hover:text-bone-200 disabled:invisible"
                      >
                        <ChevronLeft size={14} />
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={pending}
                          title="Lost"
                          onClick={() => set(l.id, "lost")}
                          className="rounded p-1 text-bone-500 hover:bg-ink-800 hover:text-rose-400"
                        >
                          <XCircle size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          title="Won"
                          onClick={() => set(l.id, "won")}
                          className="rounded p-1 text-bone-500 hover:bg-ink-800 hover:text-lime-400"
                        >
                          <Trophy size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={pending || colIdx === STAGES.length - 1}
                        onClick={() => set(l.id, ORDER[colIdx + 1])}
                        aria-label="Move forward"
                        className="rounded p-1 text-bone-500 hover:bg-ink-800 hover:text-lime-400 disabled:invisible"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}

              {!items.length && (
                <p className="rounded-lg border border-dashed border-ink-600 p-6 text-center text-xs text-bone-500">
                  Nothing here.
                </p>
              )}
            </div>
          </section>
        );
      })}

      {pending && (
        <span className="pointer-events-none fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-xs text-bone-300 shadow-lg">
          <Loader2 size={13} className="animate-spin text-lime-400" /> Saving…
        </span>
      )}
    </div>
  );
}
