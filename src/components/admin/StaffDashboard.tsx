import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { assignedClientIds, type CurrentStaff } from "@/lib/auth/staff";
import { PageHead, Stat, Table, Empty } from "@/components/admin/ui";
import { Clock, AlertCircle, ListChecks } from "lucide-react";
import PerformanceCard from "@/components/admin/PerformanceCard";
import { staffPerformance } from "@/lib/insights";

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
export default async function StaffDashboard({ me }: { me: CurrentStaff }) {
  const db = createAdminClient();
  const clientIds = await assignedClientIds(me.employeeId);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const todayStr = new Date().toISOString().slice(0, 10);

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

  const logs = myLogs ?? [];
  const hoursThisWeek = logs.reduce((s, l) => s + Number(l.hours_spent || 0), 0);
  const blockers = (openBlockers ?? []).filter((b) => String(b.blockers || "").trim());

  // Staff see exactly the same 30-day figures an admin sees about them. A
  // performance number someone cannot check is just a rumour.
  const stats = me.employeeId ? await staffPerformance(me.employeeId) : null;

  return (
    <>
      <PageHead
        title={`Welcome back, ${me.fullName.split(" ")[0]}`}
        sub={new Date().toLocaleDateString("en-GB", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        })}
        action={
          <Link href={`${BASE}/daily-logs`} className="btn btn-primary h-10">
            <Clock size={15} /> Log today&apos;s work
          </Link>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat label="My active projects" value={String(projects?.length ?? 0)} />
        <Stat label="Hours logged (7 days)" value={hoursThisWeek.toFixed(1)} tone="good" />
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
                    {new Date(b.work_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
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
                    {new Date(l.work_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
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
