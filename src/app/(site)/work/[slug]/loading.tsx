import { SkeletonCard } from "@/components/ui/Skeleton";

/**
 * Shown while the page is fetched.
 *
 * Without a loading file, Next keeps the PREVIOUS page on screen until the
 * server responds — so clicking a service link left you staring at the page
 * you were already on for about a second, which reads as a broken link.
 */
export default function Loading() {
  return (
    <section className="shell py-24">
      <div className="nd-skeleton h-4 w-20 rounded-md" />
      <div className="mt-8 nd-skeleton h-14 w-3/4 rounded-md" />
      <div className="mt-4 nd-skeleton h-4 w-1/2 rounded-md" />
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="nd-skeleton h-24 rounded-xl" />
        ))}
      </div>
      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}
