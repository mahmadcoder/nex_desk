import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import DailyLogsClient from "./DailyLogsClient";

export const metadata = { title: "Daily Work Logs" };
export const dynamic = "force-dynamic";

export default async function DailyLogsPage() {
  const me = await getCurrentStaff();
  if (!me) return null;

  const canManage = me.isPrivileged;
  const db = createAdminClient();

  // Staff see and file only their OWN logs, against only their assigned
  // projects. Otherwise this page leaks every employee's work and would let
  // someone file a log under a colleague's name.
  const assignedIds = canManage ? null : await assignedClientIds(me.employeeId);

  let logsQuery = db
    .from("daily_work_logs").select("*")
    .order("work_date", { ascending: false }).limit(100);
  if (!canManage) logsQuery = logsQuery.eq("employee_id", me.employeeId ?? "");

  // `status` is stored capitalised ('Active'); match case-insensitively so the
  // dropdown is never silently empty.
  let employeesQuery = db
    .from("employees").select("id, full_name").ilike("status", "active").order("full_name");
  if (!canManage) employeesQuery = employeesQuery.eq("id", me.employeeId ?? "");

  // The column is `name`, not `title` — selecting/ordering by `title` errored
  // out, left the list empty, and pushed the form onto its free-text fallback.
  let projectsQuery = db.from("projects").select("id, name").order("name");
  if (!canManage) {
    if (!assignedIds?.length) projectsQuery = projectsQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    else projectsQuery = projectsQuery.in("client_id", assignedIds);
  }

  const [{ data: logs }, { data: employees }, { data: projects }] = await Promise.all([
    logsQuery,
    employeesQuery,
    projectsQuery,
  ]);

  const formattedLogs = (logs ?? []).map((l: any) => ({
    id: l.id,
    employee_id: l.employee_id,
    employee_name: l.employee_name || "Staff Member",
    project_id: l.project_id,
    project_title: l.project_title || "General Agency Work",
    work_date: l.work_date,
    hours_spent: Number(l.hours_spent || 0),
    tasks_completed: l.tasks_completed,
    blockers: l.blockers,
    proof_url: l.proof_url,
    created_at: l.created_at,
  }));

  const employeesList = (employees ?? []).map((e: any) => ({
    id: e.id,
    name: e.full_name,
  }));

  const projectsList = (projects ?? []).map((p: any) => ({
    id: p.id,
    title: p.name,
  }));

  return (
    <DailyLogsClient
      initialLogs={formattedLogs}
      employeesList={employeesList}
      projectsList={projectsList}
      lockedToEmployee={!canManage}
    />
  );
}
