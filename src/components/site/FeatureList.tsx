import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one definition of a "what's included" list.
 *
 * Replaces the outlined-circle badge that was copy-pasted across the pricing
 * page, the per-service tiers and the service detail page — three elements per
 * row (ring, faint fill, glyph) at 21 rows a page, competing with the copy they
 * exist to support. The brand uses lime as a single accent; a bare check honours
 * that and lets the list read as type rather than as UI chrome.
 */

/** A tier that contains the one below it opens with "Everything in X". */
const ROLL_UP = /^everything in\b/i;

export default function FeatureList({
  features,
  variant = "list",
  size = "sm",
  className,
}: {
  features: string[];
  /**
   * "list"  — plain rows, used by every pricing tier.
   * "cards" — one bordered card per feature, used by the service page grid.
   */
  variant?: "list" | "cards";
  /** Row text size. Tiers use "sm"; the dense advantage card uses "xs". */
  size?: "sm" | "xs";
  className?: string;
}) {
  // The roll-up row is not a feature — it is the tier ladder. Ticking it like
  // everything else buries the single line that explains what this tier adds.
  const rollUp = features.find((f) => ROLL_UP.test(f.trim()));
  const rows = rollUp ? features.filter((f) => f !== rollUp) : features;

  const text = size === "xs" ? "text-xs" : "text-sm";

  // mt-[3px] lands the mark on the cap-height of the first line. Without it the
  // icon aligns to the line box and floats above the text it belongs to.
  const mark = (
    <Check
      size={15}
      strokeWidth={2.5}
      aria-hidden
      className="mt-[3px] shrink-0 text-lime-400"
    />
  );

  return (
    <div className={className}>
      {rollUp && (
        <p className="mono-tag mb-4 inline-flex items-center gap-2 rounded-lg border border-lime-400/25 bg-lime-400/[0.07] px-3 py-2 text-[11px] leading-none text-lime-300">
          <Plus size={12} aria-hidden /> {rollUp.trim()}, plus
        </p>
      )}

      {variant === "cards" ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((f) => (
            <li
              key={f}
              className="card flex items-start gap-3 border-ink-600/80 bg-ink-900/60 p-4 transition-colors hover:border-lime-400/30"
            >
              {mark}
              <span className={cn(text, "font-medium leading-relaxed text-bone-100")}>{f}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {rows.map((f) => (
            <li key={f} className={cn("flex items-start gap-3 text-bone-200", text)}>
              {mark}
              <span className="leading-relaxed">{f}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
