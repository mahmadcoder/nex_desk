"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { supportWindow, type SupportWindow as Window } from "@/lib/warranty";

/**
 * The free bug-fix period, counting down.
 *
 * Shared by the client portal and the admin client profile so both sides read
 * the same dates off the same helper — a client who is told the window closed
 * on the 14th and an admin looking at the 20th is an argument nobody wins.
 *
 * Deliberately NOT a ticking clock. The period is 14 days and `warranty_ends_on`
 * is date-granularity, so seconds would be invented precision. The count is
 * computed on mount rather than during render because server HTML containing
 * `Date.now()` mismatches on hydration.
 */
export default function SupportWindow({
  project,
  tone = "client",
}: {
  project: {
    handed_over_at?: string | null;
    warranty_ends_on?: string | null;
    warranty_days?: number | null;
  };
  /** `client` gets the full explainer; `admin` is a compact one-liner. */
  tone?: "client" | "admin";
}) {
  // null until mounted: the server cannot know "today" without desynchronising
  // from the browser that renders it a second later.
  const [win, setWin] = useState<Window | null>(null);
  useEffect(() => setWin(supportWindow(project)), [project]);

  if (!win || win.state === "none") return null;

  const expired = win.state === "expired";
  const closing = !expired && win.daysLeft <= 3;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const accent = expired
    ? "border-ink-600 bg-ink-800/60"
    : closing
      ? "border-amber-400/30 bg-amber-400/[0.06]"
      : "border-lime-400/25 bg-lime-400/[0.06]";

  const barColour = expired ? "bg-ink-500" : closing ? "bg-amber-400" : "bg-lime-400";
  const textColour = expired ? "text-bone-300" : closing ? "text-amber-300" : "text-lime-300";

  const headline = expired
    ? "Free bug-fix support has ended"
    : win.daysLeft === 0
      ? "Free bug-fix support ends today"
      : `${win.daysLeft} day${win.daysLeft === 1 ? "" : "s"} of free bug-fix support left`;

  if (tone === "admin") {
    return (
      <div>
        <p className="mono-tag mb-1 text-[11px]">Support</p>
        <p className={`text-xs font-medium ${textColour}`}>
          {expired ? "Ended" : `${win.daysLeft}d left`}
        </p>
        <p className="text-[11px] text-bone-400">to {fmt(win.endsOn)}</p>
      </div>
    );
  }

  return (
    <div className={`mt-6 rounded-xl border p-4 ${accent}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <p className={`flex items-center gap-2 text-sm font-semibold ${textColour}`}>
          {expired ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
          {headline}
        </p>
        <p className="mono-tag shrink-0 text-[11px] text-bone-300">
          {fmt(win.startsOn)} → {fmt(win.endsOn)}
        </p>
      </div>

      {!expired && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-700">
          <div
            className={`h-1.5 rounded-full transition-[width] duration-700 ${barColour}`}
            style={{ width: `${win.elapsedPct}%` }}
          />
        </div>
      )}

      {/* Says what it covers, because "support" on its own invites a request for
          a new feature and an awkward conversation about paying for it. */}
      <p className="mt-3 text-xs leading-relaxed text-bone-300">
        {expired ? (
          <>
            Anything that breaks from here is quoted first, so you always know the cost before
            we start. Raise it below and we will come back to you.
          </>
        ) : (
          <>
            Anything <strong className="text-bone-100">broken in what we built</strong> we fix
            free until {fmt(win.endsOn)}. Anything <strong className="text-bone-100">new</strong>{" "}
            is quoted first — raise it below and we will price it before any work starts.
          </>
        )}
      </p>
    </div>
  );
}
