"use client";

import { cn } from "@/lib/utils";


export function LogoMark({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("h-8 w-8", className)}
      fill="none"
      role="img"
      aria-label="Nex Desk"
    >
      <path
        d="M8 32V8l14 20V8"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="square"
        className={animated ? "draw draw-1" : undefined}
      />
      <path
        d="M27 13l7 7-7 7"
        stroke="var(--color-lime-400)"
        strokeWidth="4"
        strokeLinecap="square"
        strokeLinejoin="miter"
        className={animated ? "draw draw-2" : undefined}
      />
      {animated && (
        <style>{`
          .draw { stroke-dasharray: 100; stroke-dashoffset: 100;
                  animation: nd-draw 900ms cubic-bezier(.16,1,.3,1) forwards; }
          .draw-2 { animation-delay: 400ms; }
          @keyframes nd-draw { to { stroke-dashoffset: 0; } }
          @media (prefers-reduced-motion: reduce) {
            .draw { animation: none; stroke-dashoffset: 0; }
          }
        `}</style>
      )}
    </svg>
  );
}


export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-7 w-7 text-bone-50" />
      <span
        className="text-[1.0625rem] font-medium tracking-[-0.04em]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Nex<span className="text-bone-400">Desk</span>
      </span>
    </span>
  );
}


export function LogoTile({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-10 w-10", className)} role="img" aria-label="Nex Desk">
      <rect width="64" height="64" rx="14" fill="#0B0B0F" />
      <path d="M18 46V18l13 19V18" stroke="#F4F1EA" strokeWidth="5" strokeLinecap="square" fill="none" />
      <path d="M38 26l6 6-6 6" stroke="#D0FF4E" strokeWidth="5" strokeLinecap="square" fill="none" />
    </svg>
  );
}
