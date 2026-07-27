import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";

/**
 * Client portal loading skeleton.
 *
 * Matches the portal layout: welcome header → financial stats → project card
 * with progress → invoices/documents two-column grid.
 */
export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {/* Welcome header */}
      <div className="border-b border-ink-600 pb-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-8 w-72" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>

      {/* Financial stat cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-36" />
          </div>
        ))}
      </div>

      {/* Project card with progress bar */}
      <div className="card mt-8 p-8">
        <div className="border-b border-ink-600 pb-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-6 w-56" />
          <div className="mt-3 flex gap-6">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
        {/* Progress bar skeleton */}
        <div className="mt-6">
          <div className="mb-2 flex justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
        {/* Milestones skeleton */}
        <div className="mt-8 space-y-0 rounded-lg border border-ink-600 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b border-ink-600 p-3.5 last:border-b-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3.5 w-40" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Invoices + Documents two-column grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card p-6">
            <div className="border-b border-ink-600 pb-4">
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="mt-4 space-y-0 divide-y divide-ink-600">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between py-3.5">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
