import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { PageHead } from "@/components/admin/ui";
import TaskBoard from "@/components/admin/TaskBoard";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Task Management & Workload Hub" };
export const dynamic = "force-dynamic";

/**
 * The unified Task Management Hub.
 *
 * Provides Status Kanban, Grouping by Project/Client, and Grouping by Staff Member.
 * Staff see only work on projects for clients they are assigned to; managers see all tasks.
 */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; project?: string; view?: string }>;
}) {
  const me = await getCurrentStaff();
  if (!me) return null;

  const db = createAdminClient();
  const canManage = me.isPrivileged;
  const { who, project } = await searchParams;

  let q = db
    .from("tasks")
    .select(
      "id, title, description, status, priority, due_date, project_id, assigned_employee_id, sort_order, projects(id, name, client_id, clients(id, name, company))"
    )
    // A template is the RULE, not work — it never appears on a board.
    .eq("is_recurring_template", false)
    .order("due_date", { nullsFirst: false })
    .order("sort_order")
    .limit(500);

  if (!canManage) {
    // Their own work only. Fails closed — no employee row means no tasks.
    q = q.eq("assigned_employee_id", me.employeeId ?? "00000000-0000-0000-0000-000000000000");
  } else if (who) {
    if (who === "unassigned") {
      q = q.is("assigned_employee_id", null);
    } else {
      q = q.eq("assigned_employee_id", who);
    }
  }

  if (project) {
    q = q.eq("project_id", project);
  }

  const [{ data: tasks, error }, { data: employees }, { data: projectList }] = await Promise.all([
    q,
    canManage
      ? db
          .from("employees")
          .select("id, full_name, avatar_url, job_title")
          .neq("status", "Terminated")
          .order("full_name")
      : Promise.resolve({ data: [] as any[] }),
    canManage
      ? db
          .from("projects")
          .select("id, name, client_id, clients(id, name, company)")
          .neq("status", "cancelled")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  if (error) {
    console.error("tasks board fetch failed:", error);
  }

  let rows = tasks ?? [];

  // Staff must not see a task on a client they were unassigned from, even if
  // the task still names them. The same rule `taskIfAllowed` applies on write.
  if (!canManage) {
    const allowed = await assignedClientIds(me.employeeId);
    rows = rows.filter((t: any) => !t.projects?.client_id || allowed.includes(t.projects.client_id));
  }

  // Attachment counts in one query
  const ids = rows.map((t: any) => t.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: files } = await db
      .from("project_files")
      .select("task_id")
      .in("task_id", ids);
    for (const f of files ?? []) {
      if (f.task_id) counts.set(f.task_id, (counts.get(f.task_id) ?? 0) + 1);
    }
  }

  const employeeMap = new Map(
    (employees ?? []).map((e: any) => [e.id, { name: e.full_name, avatar: e.avatar_url, title: e.job_title }])
  );

  const cards = rows.map((t: any) => {
    const emp = t.assigned_employee_id ? employeeMap.get(t.assigned_employee_id) : null;
    const clientName = (t.projects as any)?.clients?.company || (t.projects as any)?.clients?.name || null;
    return {
      ...t,
      attachmentCount: counts.get(t.id) ?? 0,
      assignee: emp?.name ?? null,
      assigneeAvatar: emp?.avatar ?? null,
      assigneeTitle: emp?.title ?? null,
      projectName: (t.projects as any)?.name ?? "Untitled Project",
      clientName: clientName,
    };
  });

  return (
    <>
      <PageHead
        title={canManage ? "Task Management & Workload Hub" : "My Assigned Tasks"}
        sub={
          canManage
            ? "Unified task control across every project, client, and team member. View by Status, Project, or Staff Assignee with instant filtering."
            : "Tasks and deliverables assigned to you across all active client projects."
        }
      />

      <TaskBoard
        tasks={cards}
        canManage={canManage}
        projects={projectList ?? []}
        employees={employees ?? []}
        initialWho={who}
        initialProject={project}
      />
    </>
  );
}
