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

export type TabBadges = {
  overview?: number;
  timeline?: number;
  files?: number;
  tasks?: number;
  milestones?: number;
  messages?: number;
  notes?: number;
};

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
 */
export default function ProjectTabs({
  projectId,
  active,
  badges = {},
  milestoneCount = 0,
}: {
  projectId: string;
  active: TabKey;
  badges?: TabBadges;
  milestoneCount?: number;
}) {
  return (
    <div className="no-scrollbar -mx-1 mt-7 overflow-x-auto border-b border-ink-600">
      <div className="flex min-w-max gap-1 px-1">
        {TABS.map(({ key, label }) => {
          const isActive = key === active;
          const badgeVal = badges[key];

          return (
            <Link
              key={key}
              href={`/portal/projects/${projectId}?tab=${key}`}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-sm transition-colors",
                isActive
                  ? "font-medium text-lime-400"
                  : "text-bone-400 hover:text-bone-100"
              )}
            >
              <span>{label}</span>

              {/* Glowing highlight badge for unread messages, pending milestones, or active tasks */}
              {badgeVal !== undefined && badgeVal > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-lime-400 px-1 text-[10px] font-bold text-lime-950 shadow-sm animate-in fade-in zoom-in-50 duration-200">
                  {badgeVal}
                </span>
              )}

              {/* Legacy milestone count if no active badge */}
              {(!badgeVal || badgeVal === 0) && key === "milestones" && milestoneCount > 0 && (
                <span className="text-[10px] text-bone-500">{milestoneCount}</span>
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
