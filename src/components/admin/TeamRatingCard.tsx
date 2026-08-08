"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Loader2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import { rateTeamMember } from "@/lib/actions/tasks";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Scoring the team on a finished project.
 *
 * Owner/admin only, and only on a delivered project — rating work that is still
 * in flight measures mood, not delivery.
 *
 * The person rated sees their own average and nothing else: not the individual
 * score, not the note, not who gave it. A rating that can be traced back to a
 * rater stops being an honest rating.
 */
export default function TeamRatingCard({
  projectId,
  team,
  existing,
}: {
  projectId: string;
  team: { id: string; full_name: string; avatar_url?: string | null; job_title?: string | null }[];
  existing: { employee_id: string; score: number; note: string | null }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const scores = new Map(existing.map((r) => [r.employee_id, r]));

  if (!team.length) return null;

  const rate = (employeeId: string, score: number) => {
    setBusy(employeeId);
    start(async () => {
      const res = await rateTeamMember(projectId, employeeId, score);
      if (!res.ok) toast.error(res.error ?? "Could not save that.");
      else toast.success("Saved.");
      setBusy(null);
      router.refresh();
    });
  };

  return (
    <section className="card p-5">
      <h2 className="mb-1 text-base">Rate the team</h2>
      <p className="mb-4 text-xs leading-relaxed text-bone-400">
        Private to you. Each person sees their own average across all projects — never a single
        score, and never who gave it. Rating again corrects the score rather than adding another.
      </p>

      <ul className="divide-y divide-ink-700">
        {team.map((m) => {
          const current = scores.get(m.id)?.score ?? 0;
          const working = busy === m.id && pending;

          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={m.full_name} src={m.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-bone-100">{m.full_name}</p>
                  {m.job_title && <p className="mono-tag text-[10px]">{m.job_title}</p>}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {working && <Loader2 size={13} className="mr-1 animate-spin text-lime-400" />}
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={pending}
                    onClick={() => rate(m.id, n)}
                    aria-label={`${n} out of 5 for ${m.full_name}`}
                    className="rounded p-0.5 disabled:opacity-60"
                  >
                    <Star
                      size={17}
                      className={
                        n <= current
                          ? "fill-lime-400 text-lime-400"
                          : "text-bone-600 hover:text-bone-400"
                      }
                    />
                  </button>
                ))}
                {current > 0 && (
                  <span className="ml-1.5 text-xs text-bone-400">{current}/5</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
