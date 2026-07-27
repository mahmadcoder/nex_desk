import { SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <section className="shell py-24">
      <div className="nd-skeleton h-4 w-20 rounded-md" />
      <div className="mt-8 nd-skeleton h-16 w-2/3 max-w-xl rounded-md" />
      <div className="mt-6 nd-skeleton h-5 w-3/4 max-w-lg rounded-md" />
      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}
