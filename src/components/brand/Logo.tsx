"use client";

import { cn } from "@/lib/utils";

/**
 * New Nex Desk identity.
 *
 * The old hand-drawn "N + chevron" is gone. This is a typographic wordmark set
 * in the display font (so the letterforms are actually good), paired with a
 * lime block caret — a nod to a text cursor on a desk. Clean, legible, and it
 * reads instantly as a software studio.
 */

/** Square glyph for favicon / app icon: a caret block resting on a desk line. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-8 w-8", className)} role="img" aria-label="Nex Desk">
      <rect width="40" height="40" rx="10" fill="#0B0B0F" />
      {/* the desk line */}
      <rect x="9" y="27" width="22" height="2.5" rx="1.25" fill="#F4F1EA" />
      {/* the caret block sitting on it */}
      <rect x="16" y="11" width="8" height="13" rx="1.5" fill="#D0FF4E" />
    </svg>
  );
}

/** Mark + wordmark for the header. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-7 w-7" />
      <span
        className="inline-flex items-baseline text-[1.125rem] font-semibold  tracking-[-0.045em]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Nex Desk
        <span className="ml-[3px] inline-block h-[0.85em] w-[0.28em] translate-y-[0.06em] bg-lime-400" />
      </span>
    </span>
  );
}

/** Larger square lockup for the corner of documents. */
export function LogoTile({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-10 w-10", className)} role="img" aria-label="Nex Desk">
      <rect width="64" height="64" rx="14" fill="#0B0B0F" />
      <rect x="14" y="43" width="36" height="4" rx="2" fill="#F4F1EA" />
      <rect x="26" y="17" width="12" height="21" rx="2.5" fill="#D0FF4E" />
    </svg>
  );
}
