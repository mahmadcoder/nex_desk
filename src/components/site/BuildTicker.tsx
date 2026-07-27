"use client";

/**
 * The build ticker.
 *
 * A stock-ticker for the studio: two rows of real project moments streaming in
 * opposite directions, never stopping. Uses GPU-accelerated CSS animations for
 * seamless infinite looping without tab-reset lag or seam jumps. Pauses on hover.
 */

import { BUILD_TICKER_EVENTS, TickerKind as Kind } from "@/config/siteContent";

const EVENTS = BUILD_TICKER_EVENTS;

const TONE: Record<Kind, string> = {
  signed: "var(--color-lime-400)",
  paid: "var(--color-lime-400)",
  staging: "var(--color-violet-200)",
  shipped: "var(--color-lime-400)",
  started: "var(--color-bone-400)",
  review: "var(--color-bone-400)",
};

const LABEL: Record<Kind, string> = {
  signed: "signed",
  paid: "paid",
  staging: "staging",
  shipped: "shipped",
  started: "kickoff",
  review: "review",
};

function Pill({ kind, text }: { kind: Kind; text: string }) {
  return (
    <span className="mx-3 inline-flex items-center gap-3 rounded-full border border-ink-600 bg-ink-900 py-2.5 pl-3 pr-5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TONE[kind] }} />
      <span className="mono-tag shrink-0 text-[0.625rem]" style={{ color: TONE[kind] }}>
        {LABEL[kind]}
      </span>
      <span className="whitespace-nowrap text-sm text-bone-200">{text}</span>
    </span>
  );
}

function Row({ events, dir }: { events: typeof EVENTS; dir: "left" | "right" }) {
  const animClass = dir === "left" ? "animate-ticker-left" : "animate-ticker-right";

  return (
    <div className="flex overflow-hidden">
      <div className={`flex w-max shrink-0 ${animClass}`}>
        {[...events, ...events].map((e, i) => (
          <Pill key={i} kind={e.kind} text={e.text} />
        ))}
      </div>
    </div>
  );
}

export default function BuildTicker() {
  const rowA = EVENTS.filter((_, i) => i % 2 === 0);
  const rowB = EVENTS.filter((_, i) => i % 2 === 1);

  return (
    <section className="py-16">
      <div className="shell">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime-400" />
          </span>
          <p className="drawer-label" style={{ margin: 0 }}>Live at the desk</p>
        </div>
        <h2 className="mt-5 max-w-2xl text-[var(--text-h2)]">Something ships here every week.</h2>
      </div>

      {/* full-bleed ticker with edge fades; pauses on hover */}
      <div
        className="ticker-group mt-12 select-none"
        style={{
          maskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
        }}
      >
        <div className="flex flex-col gap-4">
          <Row events={rowA} dir="left" />
          <Row events={rowB} dir="right" />
        </div>
      </div>
    </section>
  );
}
