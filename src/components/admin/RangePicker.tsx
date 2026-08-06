"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { RANGE_PRESETS } from "@/lib/dates";
import { cn } from "@/lib/utils";

const REMEMBER_FOR = 60 * 60 * 24 * 365;

/**
 * The date range for Insights.
 *
 * Follows the two idioms this app already proved rather than inventing a third:
 * the URL carries the state so a link can be shared, and a cookie remembers it
 * so coming back to the page does not silently reset to a different window.
 * The server resolves which wins and passes the answer back down, so the
 * highlighted preset always matches the figures on screen.
 */
function RangePickerInner({
  preset,
  from,
  to,
}: {
  preset: string | null;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [custom, setCustom] = useState({ from, to });

  function remember(key: string, value: string | null) {
    document.cookie = `${key}=${value ? encodeURIComponent(value) : ""};path=/;max-age=${
      value ? REMEMBER_FOR : 0
    };samesite=lax`;
  }

  function pickPreset(key: string) {
    const next = new URLSearchParams(params.toString());
    next.set("range", key);
    next.delete("from");
    next.delete("to");
    remember("nx_insights_range", key);
    router.push(`?${next.toString()}`);
  }

  function applyCustom() {
    if (!custom.from || !custom.to) return;
    const next = new URLSearchParams(params.toString());
    next.delete("range");
    next.set("from", custom.from);
    next.set("to", custom.to);
    remember("nx_insights_range", null);
    router.push(`?${next.toString()}`);
  }

  const isCustom = !preset;

  return (
    <div className="card mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
      <div className="flex flex-wrap gap-1.5">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => pickPreset(p.key)}
            className={cn(
              "mono-tag rounded-full border px-3 py-1.5 text-[11px] leading-none transition-colors",
              preset === p.key
                ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
                : "border-ink-600 bg-ink-800 text-bone-300 hover:text-bone-50"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={custom.from}
          max={custom.to || undefined}
          onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
          className="rounded-lg border border-ink-500 bg-ink-800 px-2.5 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
        />
        <span className="text-xs text-bone-400">to</span>
        <input
          type="date"
          value={custom.to}
          min={custom.from || undefined}
          onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
          className="rounded-lg border border-ink-500 bg-ink-800 px-2.5 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
        />
        <button
          onClick={applyCustom}
          className={cn("btn btn-sm", isCustom && "border-lime-400/40 text-lime-400")}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

/** useSearchParams needs a Suspense boundary, the same as DashboardCurrencyTabs. */
export default function RangePicker(props: { preset: string | null; from: string; to: string }) {
  return (
    <Suspense fallback={<div className="card mb-6 h-16 animate-pulse" />}>
      <RangePickerInner {...props} />
    </Suspense>
  );
}
