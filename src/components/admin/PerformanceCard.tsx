import { Activity } from "lucide-react";
import type { StaffStats } from "@/lib/insights";

/**
 * One person's last thirty days, from data they already file.
 *
 * Deliberately not a leaderboard and deliberately not ranked on hours: days
 * logged matters more, because consistency is what actually keeps clients
 * informed. Every number here is descriptive, and the copy says what it means
 * rather than leaving it to be interpreted as a score.
 */
export default function PerformanceCard({
  stats,
  ownView = false,
}: {
  stats: StaffStats;
  /** True when the staff member is looking at their own figures. */
  ownView?: boolean;
}) {
  // Tasks, not milestones. The old figure counted every milestone on every
  // project this person had logged against, so on a shared project everyone
  // was credited with everyone else's work.
  const onTimeRate = stats.tasksDone
    ? Math.round(((stats.tasksDone - stats.tasksLate) / stats.tasksDone) * 100)
    : null;

  return (
    <section className="card border-ink-600 p-5">
      <h2 className="mb-4 flex items-center gap-2 border-b border-ink-700 pb-3 text-base font-semibold text-bone-50">
        <Activity size={16} className="text-lime-400" />
        {ownView ? "Your last 30 days" : "Last 30 days"}
      </h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="mono-tag text-[11px]">Days logged</p>
          <p className="mt-0.5 font-mono text-xl text-bone-50">{stats.daysLogged30}</p>
        </div>
        <div>
          <p className="mono-tag text-[11px]">Hours</p>
          <p className="mt-0.5 font-mono text-xl text-bone-50">{stats.hours30.toFixed(1)}</p>
        </div>
        <div>
          <p className="mono-tag text-[11px]">Shared with clients</p>
          <p className="mt-0.5 font-mono text-xl text-bone-50">{stats.sharedRatio}%</p>
        </div>
        <div>
          <p className="mono-tag text-[11px]">Tasks done</p>
          <p className="mt-0.5 font-mono text-xl text-bone-50">{stats.tasksDone}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-ink-700 pt-4 sm:grid-cols-4">
        <div>
          <p className="mono-tag text-[11px]">On time</p>
          <p className="mt-0.5 font-mono text-xl text-bone-50">
            {onTimeRate === null ? "—" : `${onTimeRate}%`}
          </p>
        </div>
        <div>
          <p className="mono-tag text-[11px]">Overdue now</p>
          <p
            className={`mt-0.5 font-mono text-xl ${
              stats.tasksOverdue ? "text-amber-400" : "text-bone-50"
            }`}
          >
            {stats.tasksOverdue}
          </p>
        </div>
        <div>
          <p className="mono-tag text-[11px]">Tracked hours</p>
          <p className="mt-0.5 font-mono text-xl text-bone-50">{stats.trackedHours30}</p>
        </div>
        <div>
          {/* Only ever their OWN average, never an individual score and never
              who gave it — a rating that traces back to a person stops being an
              honest rating. */}
          <p className="mono-tag text-[11px]">Average rating</p>
          <p className="mt-0.5 font-mono text-xl text-bone-50">
            {stats.avgRating === null ? "—" : `${stats.avgRating}/5`}
          </p>
          {stats.ratedProjects > 0 && (
            <p className="mono-tag text-[10px] text-bone-500">
              {stats.ratedProjects} project{stats.ratedProjects === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-ink-700 pt-3 text-[11px] leading-relaxed text-bone-300">
        {stats.entries30 === 0 ? (
          <p>
            No work logged in the last 30 days. If work is happening, it is invisible to the
            client — and to anyone deciding who deserves a raise.
          </p>
        ) : (
          <>
            <p>
              {stats.entries30} entries across {stats.daysLogged30} days. Consistency beats
              volume: a client who hears something most days never has to chase.
            </p>
            {stats.sharedRatio < 40 && (
              <p className="text-amber-300">
                Only {stats.sharedRatio}% of these reached the client. Most work is worth
                sharing — the portal timeline is the whole point of logging it.
              </p>
            )}
            {stats.milestonesLate > 0 && (
              <p>
                {stats.tasksLate} of {stats.tasksDone} tasks landed after their
                due date.
              </p>
            )}
            {stats.blockers30 > 0 && (
              <p>
                {stats.blockers30} blocker{stats.blockers30 === 1 ? "" : "s"} raised — that is a
                good sign, not a bad one. Silent blockers are the expensive kind.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
