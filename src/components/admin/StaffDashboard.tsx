import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { assignedClientIds, firstName, type CurrentStaff } from "@/lib/auth/staff";
import { Stat, Table, Empty } from "@/components/admin/ui";
import Avatar from "@/components/Avatar";
import { Clock, AlertCircle, ListChecks } from "lucide-react";
import PerformanceCard from "@/components/admin/PerformanceCard";
import { staffPerformance } from "@/lib/insights";
import { fmtDateLong, fmtDate, agencyDay } from "@/lib/datetime";
import AttendanceWidget from "@/components/admin/AttendanceWidget";
import TimerBar from "@/components/admin/TimerBar";
import { myAttendanceToday } from "@/lib/actions/attendance";
import { runningTimer, myTrackedToday } from "@/lib/actions/timeTracking";
import { humanDuration } from "@/lib/workHours";
import HolidayNoticeBanner, { type HolidayItem } from "@/components/ui/HolidayNoticeBanner";
import LiveClockGreeting from "@/components/ui/LiveClockGreeting";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;

/**
 * The dashboard an employee sees.
 *
 * Deliberately carries NO money: no revenue, outstanding, overdue, contract
 * values or leads. The owner/admin dashboard at app/nx-control/page.tsx is
 * agency-wide and must never be rendered for a staff role.
 *
 * Everything here is scoped to the clients this employee is actually assigned
 * to, and fails closed — an employee with no assignments sees an empty state,
 * not the whole agency.
 */
export default async function StaffDashboard({
  me,
  holidays = [],
}: {
  me: CurrentStaff;
  holidays?: HolidayItem[];
}) {
  const db = createAdminClient();
  const clientIds = await assignedClientIds(me.employeeId);

  // Agency time, not UTC. `attendance.ts` keys every check-in row on
  // `agencyDay()`, so computing the dashboard's idea of "today" from
  // `toISOString()` made the two disagree between midnight and 5am local —
  // the panel would read yesterday's attendance and highlight yesterday's
  // tasks as due today.
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = agencyDay(weekStart);

  const todayStr = agencyDay();

  // The two clocks. Both degrade to null/0 when the 2027-26 migration has not
  // been run, so a dashboard never breaks over a feature that is not on yet.
  const [attendance, running, trackedTodaySec] = await Promise.all([
    myAttendanceToday(),
    runningTimer(),
    myTrackedToday(),
  ]);

  // Next three calls, for clients this person is actually on. Degrades to an
  // empty list before the meetings migration.
  const { data: upcomingMeetings } = clientIds.length
    ? await db
        .from("meetings")
        .select("id, title, starts_at, join_url, clients(name)")
        .in("client_id", clientIds)
        .eq("status", "scheduled")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(3)
    : { data: [] as any[] };

  const [{ data: projects }, { data: myLogs }, { data: openBlockers }, { data: openTasks, error: tasksError }] = await Promise.all([
    clientIds.length
      ? db.from("projects")
          .select("id, name, status, progress, deadline, clients(name)")
          .in("client_id", clientIds)
          .not("status", "in", "(completed,cancelled)")
          .order("deadline")
      : Promise.resolve({ data: [] as any[] }),

    me.employeeId
      ? db.from("daily_work_logs")
          .select("id, work_date, hours_spent, tasks_completed, project_title, client_visible")
          .eq("employee_id", me.employeeId)
          .gte("work_date", weekStartStr)
          .order("work_date", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),

    me.employeeId
      ? db.from("daily_work_logs")
          .select("id, work_date, blockers, project_title")
          .eq("employee_id", me.employeeId)
          .not("blockers", "is", null)
          .order("work_date", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as any[] }),

    me.employeeId
      ? db.from("tasks")
          .select("id, title, due_date, status, project_id, projects(name)")
          .eq("assigned_employee_id", me.employeeId)
          .neq("status", "done")
          // Undated tasks last: a date is a commitment, and commitments come
          // before "whenever".
          .order("due_date", { nullsFirst: false })
          .limit(12)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  // Before the 2027-09 migration this errors and returns null. The dashboard
  // must still render — a missing task list is not a reason to lose the whole
  // page — but it has to be visible in the logs.
  if (tasksError) {
    console.error("Staff dashboard: could not load tasks", tasksError);
  }
  const myTasks = openTasks ?? [];

  // Split rather than one undifferentiated list. Overdue and "today" are the
  // only two questions anyone opens this page to answer.
  const overdueTasks = myTasks.filter(
    (t: any) => t.due_date && t.due_date < todayStr
  );
  const todayTasks = myTasks.filter(
    (t: any) => t.due_date === todayStr || t.status === "doing"
  );

  const logs = myLogs ?? [];
  const hoursThisWeek = logs.reduce((s, l) => s + Number(l.hours_spent || 0), 0);
  const blockers = (openBlockers ?? []).filter((b) => String(b.blockers || "").trim());

  // Staff see exactly the same 30-day figures an admin sees about them. A
  // performance number someone cannot check is just a rumour.
  const stats = me.employeeId ? await staffPerformance(me.employeeId) : null;

  return (
    <>
      <LiveClockGreeting name={me.fullName} role="staff" className="mb-6" />

      {/* Written out rather than passed to PageHead, whose `title` is a string
          and so cannot carry the avatar. flex-wrap + min-w-0 so a long name
          wraps instead of squeezing the photo on a phone. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <Link href={`${BASE}/profile`} className="shrink-0" aria-label="My profile">
            <Avatar name={me.fullName} src={me.avatarUrl} size="md" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl sm:text-2xl">Welcome back, {firstName(me.fullName)}</h1>
            <p className="mt-0.5 text-xs text-bone-300">
              {fmtDateLong()}
            </p>
          </div>
        </div>
        <Link href={`${BASE}/daily-logs`} className="btn btn-primary h-10 shrink-0">
          <Clock size={15} /> Log today&apos;s work
        </Link>
      </div>

      <HolidayNoticeBanner holidays={holidays} />

      {/* The clock comes first: it is the thing with a deadline attached to it,
          and everything below is a summary that can wait. */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {attendance && (
          <AttendanceWidget
            row={attendance.row}
            verdict={attendance.verdict}
            hours={attendance.hours}
          />
        )}
        <div className="card p-4">
          <p className="mono-tag mb-2 text-[10px]">
            Time tracking · {humanDuration(trackedTodaySec)} today
          </p>
          <TimerBar
            running={running}
            tasks={(openTasks ?? []).map((t: any) => ({
              id: t.id,
              title: t.title,
              project_id: t.project_id,
            }))}
          />
        </div>
      </div>

      {/* Overdue first, and only when there is something overdue — a heading
          that is usually empty stops being read. */}
      {!!overdueTasks.length && (
        <section className="card mb-6 border-amber-400/30 bg-amber-400/[0.04] p-4">
          <p className="mono-tag mb-2 text-amber-300">
            Overdue · {overdueTasks.length}
          </p>
          <ul className="space-y-1.5 text-sm">
            {overdueTasks.slice(0, 5).map((t: any) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-bone-100">{t.title}</span>
                <span className="mono-tag text-[10px] text-amber-400">
                  due {fmtDate(t.due_date)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <p className="mono-tag mb-2 text-[10px]">
            Today · {todayTasks.length} task{todayTasks.length === 1 ? "" : "s"}
          </p>
          {todayTasks.length ? (
            <ul className="space-y-1.5 text-sm">
              {todayTasks.slice(0, 6).map((t: any) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-bone-100">{t.title}</span>
                  <span className="mono-tag shrink-0 text-[10px] capitalize">{t.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-bone-400">Nothing due today.</p>
          )}
          <Link href={`${BASE}/tasks`} className="mono-tag mt-3 inline-block hover:text-lime-400">
            Open the board →
          </Link>
        </section>

        <section className="card p-4">
          <p className="mono-tag mb-2 text-[10px]">Upcoming meetings</p>
          {(upcomingMeetings ?? []).length ? (
            <ul className="space-y-2 text-sm">
              {(upcomingMeetings ?? []).map((m: any) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-bone-100">{m.title}</p>
                    <p className="mono-tag text-[10px]">
                      {fmtDate(m.starts_at)} · {m.clients?.name ?? ""}
                    </p>
                  </div>
                  {m.join_url && (
                    <a
                      href={m.join_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mono-tag shrink-0 text-[11px] text-lime-400 hover:underline"
                    >
                      Join
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-bone-400">No calls booked.</p>
          )}
        </section>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat label="My active projects" value={String(projects?.length ?? 0)} />
        <Stat label="Tracked today" value={humanDuration(trackedTodaySec)} tone="good" />
        <Stat label="Entries this week" value={String(logs.length)} />
        <Stat
          label="Open blockers"
          value={String(blockers.length)}
          tone={blockers.length ? "warn" : "default"}
        />
      </div>

      {/* Work handed to this person, above everything else. The whole point of
          the board is that it appears where they already come, rather than
          being a place they have to remember to visit. */}
      {!!myTasks.length && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-base">
            <ListChecks size={15} className="text-lime-400" /> On your plate
          </h2>
          <ul className="card divide-y divide-ink-600">
            {myTasks.map((t: any) => {
              const late = t.due_date && t.due_date < todayStr;
              const soon = t.due_date && t.due_date === todayStr;
              return (
                <li key={t.id} className="flex items-start gap-3 p-4">
                  <span
                    aria-hidden
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      late ? "bg-rose-400" : soon ? "bg-amber-400" : "bg-ink-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-bone-100">{t.title}</p>
                    <p className="mt-0.5 text-xs text-bone-300">
                      <Link
                        href={`${BASE}/projects/${t.project_id}`}
                        className="hover:text-lime-400"
                      >
                        {(t.projects as any)?.name ?? "Project"}
                      </Link>
                      {t.due_date && (
                        <span className={late ? "text-rose-300" : soon ? "text-amber-300" : ""}>
                          {" "}· {late ? "was due" : soon ? "due today" : "due"}{" "}
                          {!soon && t.due_date}
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-bone-400">
            Tick these off while writing your work log — no need to do it twice.
          </p>
        </section>
      )}

      {stats && (
        <div className="mt-6">
          <PerformanceCard stats={stats} ownView />
        </div>
      )}

      {!!blockers.length && (
        <section className="mt-8">
          <h2 className="mb-3 text-base">Blockers you raised</h2>
          <ul className="card divide-y divide-ink-600">
            {blockers.map((b) => (
              <li key={b.id} className="flex items-start gap-3 p-4">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <p className="text-sm text-bone-100">{b.blockers}</p>
                  <p className="mt-0.5 text-xs text-bone-300">
                    {b.project_title || "General"} ·{" "}
                    {fmtDate(b.work_date)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base">My projects</h2>
          <Link href={`${BASE}/projects`} className="mono-tag hover:text-lime-400">view all</Link>
        </div>

        {!projects?.length ? (
          <Empty
            title="No projects assigned yet"
            body="Once an admin assigns you to a client, their projects appear here."
          />
        ) : (
          <Table head={["Project", "Client", "Progress", "Deadline"]}>
            {projects.map((p: any) => (
              <tr key={p.id} className="hover:bg-ink-700/30">
                <td className="px-5 py-3">
                  <Link href={`${BASE}/projects/${p.id}`} className="hover:text-lime-400">{p.name}</Link>
                </td>
                <td className="px-5 py-3 text-bone-300">{p.clients?.name}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-16 overflow-hidden rounded bg-ink-600">
                      <div className="h-1 bg-lime-400" style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="mono-tag">{p.progress}%</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-bone-300">{p.deadline ?? "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-base">My recent work</h2>
        {!logs.length ? (
          <Empty
            title="Nothing logged this week"
            body="Submit a daily work log so your progress reaches the client."
          />
        ) : (
          <ul className="card divide-y divide-ink-600">
            {logs.slice(0, 8).map((l) => (
              <li key={l.id} className="p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="mono-tag text-[11px] text-lime-400">
                    {fmtDate(l.work_date)}
                  </span>
                  <span className="text-xs text-bone-300">{l.project_title || "General"}</span>
                  <span className="mono-tag text-[11px] text-bone-300">{Number(l.hours_spent || 0)}h</span>
                  {l.client_visible && (
                    <span className="mono-tag rounded-full border border-lime-400/25 bg-lime-400/10 px-2 py-0.5 text-[10px] text-lime-400">
                      Shared with client
                    </span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-bone-100">
                  {l.tasks_completed}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
