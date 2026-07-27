import { SkeletonTable } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="p-6">
      <div className="nd-skeleton mb-6 h-8 w-40 rounded-md" />
      <SkeletonTable rows={8} cols={["28%", "24%", "20%", "16%", "12%"]} />
    </div>
  );
}
