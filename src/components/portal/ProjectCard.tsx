import Link from "next/link";
import { CalendarDays, Flag, Users, ArrowRight, AlertTriangle } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Badge } from "@/components/admin/ui";
import { fmtDate } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "border-rose-400/40 bg-rose-400/10 text-rose-300",
  high: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  normal: "border-ink-600 bg-ink-800 text-bone-300",
  low: "border-ink-600 bg-ink-800 text-bone-400",
};

/**
 * One project, at a glance.
 *
 * `deadline` and `estimated_delivery` are shown side by side on purpose. The
 * deadline is what was agreed and sits on a signed PDF; the estimate is where
 * we currently think it lands. Showing only one of them is how a slip stays
 * invisible until the day it arrives — so when the estimate is past the
 * deadline the card says so, plainly, rather than letting the client work it
 * out from two dates.
 */
export default function ProjectCard({
  project,
  team = [],
}: {
  project: any;
  team?: any[];
}) {
  const progress = Math.max(0, Math.min(100, Number(project.progress ?? 0)));
  const priority = String(project.priority ?? "normal");
  const stack: string[] = project.tech_stack ?? [];

  const deadline = project.deadline;
  const estimate = project.estimated_delivery;
  const slipping = !!deadline && !!estimate && new Date(estimate) > new Date(deadline);

  return (
    <Link
      href={`/portal/projects/${project.id}`}
      className="card group block p-5 transition-colors hover:border-lime-400/40 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-medium text-bone-50 transition-colors group-hover:text-lime-400">
            {project.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{String(project.status).replace(/_/g, " ")}</Badge>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] capitalize ${
                PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.normal
              }`}
            >
              <Flag size={10} aria-hidden /> {priority}
            </span>
          </div>
        </div>
        <ArrowRight
          size={16}
          className="mt-1 shrink-0 text-bone-500 transition-transform group-hover:translate-x-0.5 group-hover:text-lime-400"
          aria-hidden
        />
      </div>

      {/* Progress */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="mono-tag">Progress</span>
          <span className="font-medium text-bone-200">{progress}%</span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700"
          role="img"
          aria-label={`${progress} percent complete`}
        >
          <div
            className="h-full rounded-full bg-lime-400 transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-ink-700 pt-4">
        <div>
          <p className="mono-tag text-[10px]">Deadline</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-bone-200">
            <CalendarDays size={13} className="shrink-0 text-bone-400" aria-hidden />
            {deadline ? fmtDate(deadline) : "—"}
          </p>
        </div>
        <div>
          <p className="mono-tag text-[10px]">Estimated delivery</p>
          <p
            className={`mt-1 flex items-center gap-1.5 text-sm ${
              slipping ? "text-amber-300" : "text-bone-200"
            }`}
          >
            {slipping && <AlertTriangle size={13} className="shrink-0" aria-hidden />}
            {estimate ? fmtDate(estimate) : "—"}
          </p>
        </div>
      </div>

      {slipping && (
        <p className="mt-2 text-xs leading-relaxed text-amber-300/90">
          Currently tracking past the agreed deadline. We will always tell you why before
          it matters.
        </p>
      )}

      {/* Stack */}
      {stack.length > 0 && (
        <div className="mt-4">
          <p className="mono-tag mb-2 text-[10px]">Built with</p>
          <div className="flex flex-wrap gap-1.5">
            {stack.map((t) => (
              <span
                key={t}
                className="rounded-md border border-ink-600 bg-ink-800 px-2 py-0.5 text-[11px] text-bone-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Team */}
      {team.length > 0 && (
        <div className="mt-4 flex items-center gap-2.5 border-t border-ink-700 pt-4">
          <Users size={13} className="shrink-0 text-bone-400" aria-hidden />
          <div className="flex -space-x-2">
            {team.slice(0, 5).map((m: any) => (
              <span key={m.id} title={`${m.full_name}${m.job_title ? ` — ${m.job_title}` : ""}`}>
                <Avatar name={m.full_name} src={m.avatar_url} size="sm" />
              </span>
            ))}
          </div>
          {team.length > 5 && (
            <span className="text-xs text-bone-400">+{team.length - 5}</span>
          )}
        </div>
      )}
    </Link>
  );
}
