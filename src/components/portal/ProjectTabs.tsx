import Link from "next/link";
import { cn } from "@/lib/utils";

export type TabKey =
  | "overview"
  | "timeline"
  | "files"
  | "tasks"
  | "milestones"
  | "messages"
  | "notes";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "timeline", label: "Timeline" },
  { key: "files", label: "Files" },
  { key: "tasks", label: "Tasks" },
  { key: "milestones", label: "Milestones" },
  { key: "messages", label: "Messages" },
  { key: "notes", label: "Notes" },
];

/**
 * The project tab strip.
 *
 * Real links carrying `?tab=`, not buttons flipping local state — so a tab is
 * bookmarkable, the back button behaves, and an email can point a client
 * straight at their milestones. A server component for the same reason: there
 * is no state here to own.
 *
 * Scrolls horizontally rather than wrapping. Seven tabs wrapping to a second
 * row on a phone reads as two separate controls.
 */
export default function ProjectTabs({
  projectId,
  active,
  milestoneCount = 0,
}: {
  projectId: string;
  active: TabKey;
  milestoneCount?: number;
}) {
  return (
    <div className="no-scrollbar -mx-1 mt-7 overflow-x-auto border-b border-ink-600">
      <div className="flex min-w-max gap-1 px-1">
        {TABS.map(({ key, label }) => {
          const isActive = key === active;
          return (
            <Link
              key={key}
              href={`/portal/projects/${projectId}?tab=${key}`}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative whitespace-nowrap px-3.5 py-2.5 text-sm transition-colors",
                isActive
                  ? "font-medium text-lime-400"
                  : "text-bone-400 hover:text-bone-100"
              )}
            >
              {label}
              {key === "milestones" && milestoneCount > 0 && (
                <span className="ml-1.5 text-[10px] text-bone-500">{milestoneCount}</span>
              )}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-lime-400" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
