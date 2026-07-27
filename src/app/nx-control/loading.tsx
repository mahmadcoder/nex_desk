import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";

/**
 * Universal admin loading skeleton.
 *
 * Placed at the nx-control root, Next.js App Router automatically uses this
 * for EVERY admin sub-route (clients, invoices, projects, deals, etc.) unless
 * that route has its own more-specific loading.tsx override.
 *
 * The layout is intentionally generic: page heading + stat cards + data table —
 * which matches the common pattern across all admin pages.
 */
export default function Loading() {
  return (
    <>
      {/* PageHead skeleton */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-44" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {/* Stat cards row */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Main data table skeleton */}
      <div className="mt-8">
        <SkeletonTable rows={7} cols={["25%", "20%", "20%", "18%", "17%"]} />
      </div>
    </>
  );
}
