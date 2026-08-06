"use client";

/* eslint-disable @next/next/no-img-element */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, AlertTriangle } from "lucide-react";
import { decideMyPhotoRemoval } from "@/lib/actions/staff";

type Entry = {
  id: string;
  photo_url: string | null;
  previous_url: string | null;
  changed_by_self: boolean;
  created_at: string;
};

/**
 * Every photo this person has set, and the answer to a pending removal.
 *
 * Admin-only. Nothing in the staff role renders this component or reads the
 * table behind it — a staff member sees the photo they set and the fact that a
 * removal is waiting, and nothing else.
 */
export default function PhotoHistory({
  employeeId,
  name,
  currentUrl,
  removalRequestedAt,
  entries,
}: {
  employeeId: string;
  name: string;
  currentUrl: string | null;
  removalRequestedAt: string | null;
  entries: Entry[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const changes = entries.filter((e) => e.changed_by_self).length;

  function decide(takeDown: boolean) {
    start(async () => {
      const res = await decideMyPhotoRemoval(employeeId, takeDown);
      if (!res.ok) {
        toast.error(res.error ?? "That didn't work.");
        return;
      }
      toast.success(takeDown ? "Photo taken down." : "Photo kept.");
      router.refresh();
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section className="card my-6 space-y-4 border-ink-600 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-bone-50">
          <ImageIcon size={16} className="text-lime-400" /> Photo history
          {changes > 0 && (
            <span className="mono-tag text-[11px]">
              changed {changes} time{changes === 1 ? "" : "s"}
            </span>
          )}
        </h2>
      </div>

      {/* The decision, above the gallery — this is the only thing here that
          needs answering, and burying it under thumbnails would lose it. */}
      {removalRequestedAt && (
        <div className="rounded-lg border border-amber-400/35 bg-amber-400/[0.08] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <AlertTriangle size={15} /> {name} asked for their photo to come down
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-bone-200">
            Asked on {fmt(removalRequestedAt)}. It is still showing on their profile and in the
            client portal — nothing has changed for clients yet.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn h-9 px-4 text-sm" disabled={pending} onClick={() => decide(true)}>
              Take it down
            </button>
            <button
              className="btn btn-primary h-9 px-4 text-sm"
              disabled={pending}
              onClick={() => decide(false)}
            >
              Keep it
            </button>
          </div>
        </div>
      )}

      {entries.length ? (
        <ul className="flex flex-wrap gap-3">
          {entries.map((e) => {
            const isCurrent = !!e.photo_url && e.photo_url === currentUrl;
            return (
              <li key={e.id} className="w-[92px] text-center">
                <span
                  className={`grid h-[92px] w-[92px] place-items-center overflow-hidden rounded-lg border bg-ink-800 ${
                    isCurrent ? "border-lime-400/50" : "border-ink-600"
                  }`}
                >
                  {e.photo_url ? (
                    <img src={e.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="mono-tag px-1 text-[10px] leading-tight text-bone-400">
                      removed
                    </span>
                  )}
                </span>
                <p className="mono-tag mt-1 text-[10px] leading-tight text-bone-400">
                  {fmt(e.created_at)}
                </p>
                {isCurrent && <p className="text-[10px] leading-tight text-lime-400">current</p>}
                {!e.changed_by_self && (
                  <p className="text-[10px] leading-tight text-bone-500">by admin</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs leading-relaxed text-bone-300">
          Nothing recorded yet. Every photo set from now on is kept here, including any they
          remove.
        </p>
      )}
    </section>
  );
}
