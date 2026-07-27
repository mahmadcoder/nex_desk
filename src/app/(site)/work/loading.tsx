import { SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <section className="shell py-24">
      <div className="nd-skeleton h-4 w-16 rounded-md" />
      <div className="mt-8 nd-skeleton h-12 w-2/3 rounded-md" />
      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}
