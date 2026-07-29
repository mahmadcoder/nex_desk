"use client";

import { cn } from "@/lib/utils";

/**
 * Nex Desk brand identity — 2026 refresh.
 *
 * A geometric logomark: an abstract "N" formed by two overlapping planes
 * (desk surface + screen), with the lime accent as the connection point.
 * Clean, modern, scales from 16px favicon to 200px print.
 */

/** Square glyph for favicon / app icon: abstract desk + screen planes. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-8 w-8", className)} role="img" aria-label="Nex Desk">
      <defs>
        <linearGradient id="nd-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#111827" />
          <stop offset="100%" stopColor="#0A0E17" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#nd-grad)" />
      {/* Desk surface — horizontal bar */}
      <rect x="8" y="26" width="24" height="3" rx="1.5" fill="#F1F5F9" opacity="0.9" />
      {/* Screen / caret block — the lime accent */}
      <rect x="14" y="9" width="12" height="14" rx="2.5" fill="#D0FF4E" />
      {/* Subtle reflection line on the block */}
      <rect x="16" y="11" width="3" height="8" rx="1" fill="#FFFFFF" opacity="0.15" />
    </svg>
  );
}

/** Mark + wordmark for the header. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-7 w-7" />
      <span
        className="inline-flex items-baseline text-[1.125rem] font-semibold tracking-[-0.045em]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <span className="text-bone-50">Nex</span>
        <span className="ml-[1px] text-bone-50"> Desk</span>
        <span className="ml-[3px] inline-block h-[0.85em] w-[0.28em] translate-y-[0.06em] rounded-[1px] bg-lime-400" />
      </span>
    </span>
  );
}

/** Larger square lockup for the corner of documents. */
export function LogoTile({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-10 w-10", className)} role="img" aria-label="Nex Desk">
      <defs>
        <linearGradient id="nd-grad-lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#111827" />
          <stop offset="100%" stopColor="#0A0E17" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#nd-grad-lg)" />
      <rect x="12" y="42" width="40" height="5" rx="2.5" fill="#F1F5F9" opacity="0.9" />
      <rect x="22" y="14" width="20" height="22" rx="4" fill="#D0FF4E" />
      <rect x="25" y="17" width="5" height="13" rx="1.5" fill="#FFFFFF" opacity="0.15" />
    </svg>
  );
}
