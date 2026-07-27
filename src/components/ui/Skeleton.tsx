import { cn } from "@/lib/utils";

/**
 * Skeleton primitives — the shimmering placeholders shown while data loads.
 *
 * Build page-specific skeletons by composing these, then drop them in a
 * route's loading.tsx (Next.js shows it automatically during the fetch).
 *
 * The shimmer uses the `nd-shimmer` animation — see the CSS snippet in
 * README-UPDATE-11 to add it once to globals.css.
 */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("nd-skeleton rounded-md", className)} />;
}

/** A block of fake text lines; last line is shorter, as real text tends to be. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Card placeholder — matches the site's .card shape (image + title + text). */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("card overflow-hidden p-0", className)}>
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

/** One row of a table skeleton. Give it the column widths that match your table. */
export function SkeletonRow({ cols = ["30%", "20%", "20%", "15%", "15%"] }: { cols?: string[] }) {
  return (
    <div className="flex items-center gap-4 border-b border-ink-600 px-4 py-4">
      {cols.map((w, i) => (
        <div key={i} style={{ width: w }}>
          <Skeleton className="h-3.5 w-full" />
        </div>
      ))}
    </div>
  );
}

/** A whole table skeleton: header strip + N rows. */
export function SkeletonTable({ rows = 6, cols }: { rows?: number; cols?: string[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-600">
      <div className="flex items-center gap-4 border-b border-ink-600 bg-ink-800 px-4 py-3">
        {(cols ?? ["30%", "20%", "20%", "15%", "15%"]).map((w, i) => (
          <div key={i} style={{ width: w }}><Skeleton className="h-3 w-16" /></div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}
