import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { PageHead } from "@/components/admin/ui";
import { buildCalendar, isoOf } from "@/lib/calendar";
import { agencyDay, fmtMonth } from "@/lib/datetime";
import CalendarClient from "@/components/admin/CalendarClient";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "Calendar | NexDesk" };
export const dynamic = "force-dynamic";

/**
 * Supercharged Calendar:
 * Tasks due dates, meetings with 1-click video join links, project milestones & deadlines,
 * employee leaves, and official agency holidays.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const me = await getCurrentStaff();
  if (!me) return null;

  const db = createAdminClient();
  const canManage = me.isPrivileged;
  const clientIds = canManage ? null : await assignedClientIds(me.employeeId);

  const { month } = await searchParams;
  const anchor = new Date(`${month ?? agencyDay().slice(0, 7)}-01T00:00:00`);
  const year = anchor.getFullYear();
  const mon = anchor.getMonth();

  const from = isoOf(new Date(year, mon, 1));
  const to = isoOf(new Date(year, mon + 1, 0));

  // Scoping helper for client-based queries
  const scopeClient = (q: any, column = "client_id") =>
    clientIds
      ? q.in(column, clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"])
      : q;

  // Build tasks query: scoped to employee if staff, or all if privileged
  let tasksQuery = db
    .from("tasks")
    .select(
      "id, title, status, priority, due_date, project_id, assigned_employee_id, projects(id, name, client_id, clients(id, name)), employees(id, full_name)"
    )
    .eq("is_recurring_template", false)
    .gte("due_date", from)
    .lte("due_date", to);

  if (!canManage) {
    tasksQuery = tasksQuery.eq(
      "assigned_employee_id",
      me.employeeId ?? "00000000-0000-0000-0000-000000000000"
    );
  }

  // Fetch all calendar sources in parallel
  const [
    { data: rawMeetings },
    { data: rawProjects },
    { data: rawLeave },
    { data: rawTasks },
    { data: rawHolidays },
  ] = await Promise.all([
    db
      .from("meetings")
      .select(
        "id, title, starts_at, duration_min, join_url, agenda, status, client_id, staff_ids, clients(name), projects(name)"
      )
      .gte("starts_at", `${from}T00:00:00`)
      .lte("starts_at", `${to}T23:59:59`),
    scopeClient(
      db
        .from("projects")
        .select("id, name, deadline, estimated_delivery, client_id, clients(name)")
        .or(
          `and(deadline.gte.${from},deadline.lte.${to}),and(estimated_delivery.gte.${from},estimated_delivery.lte.${to})`
        )
    ),
    db
      .from("leave_requests")
      .select("id, start_date, end_date, leave_type, employee_id, employees(full_name)")
      .eq("status", "approved")
      .lte("start_date", to)
      .gte("end_date", from),
    tasksQuery,
    db
      .from("holidays")
      .select("id, holiday_on, name")
      .gte("holiday_on", from)
      .lte("holiday_on", to),
  ]);

  // Filter meetings for staff: assigned clients OR staff_ids includes me
  const meetings = canManage
    ? (rawMeetings ?? [])
    : (rawMeetings ?? []).filter((m: any) => {
        if (m.client_id && clientIds?.includes(m.client_id)) return true;
        if (Array.isArray(m.staff_ids) && me.employeeId && m.staff_ids.includes(me.employeeId))
          return true;
        return false;
      });

  // Filter leave: staff sees own leave only; privileged sees all
  const leave = canManage
    ? (rawLeave ?? [])
    : (rawLeave ?? []).filter((l: any) => l.employee_id === me.employeeId);

  // Fetch milestones for visible projects
  const projectIds = (rawProjects ?? []).map((p: any) => p.id);
  const { data: milestones } = projectIds.length
    ? await db
        .from("milestones")
        .select("id, title, due_date, is_done, project_id, projects(name)")
        .in("project_id", projectIds)
        .gte("due_date", from)
        .lte("due_date", to)
    : { data: [] as any[] };

  const byDay = buildCalendar({
    meetings: meetings ?? [],
    projects: rawProjects ?? [],
    milestones: milestones ?? [],
    leave: leave ?? [],
    tasks: rawTasks ?? [],
    holidays: rawHolidays ?? [],
  });

  const eventsArray = [...byDay.entries()];
  const today = agencyDay();

  return (
    <>
      <PageHead
        title="Calendar"
        sub={
          canManage
            ? "Unified schedule of tasks, meetings, project deadlines, team leave, and agency holidays."
            : "Your daily work agenda: assigned tasks due, client meetings, project milestones, and holidays."
        }
      />

      <Suspense
        fallback={
          <div className="flex h-72 items-center justify-center rounded-xl border border-ink-800 bg-ink-900/40">
            <div className="text-center">
              <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
              <p className="text-xs text-bone-300">Loading calendar events…</p>
            </div>
          </div>
        }
      >
        <CalendarClient
          key={`${year}-${mon}`}
          events={eventsArray}
          currentYear={year}
          currentMonth={mon}
          monthLabel={fmtMonth(anchor)}
          todayIso={today}
          isPrivileged={canManage}
          basePath={BASE}
        />
      </Suspense>
    </>
  );
}
