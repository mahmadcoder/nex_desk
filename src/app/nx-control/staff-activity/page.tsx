import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Stat } from "@/components/admin/ui";
import StaffActivityClient from "@/components/admin/StaffActivityClient";
import { redirect } from "next/navigation";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Staff Task Tracker & Live Activity" };
export const dynamic = "force-dynamic";

export default async function StaffActivityPage() {
  const me = await getCurrentStaff();
  if (!me) return null;
  if (!me.isPrivileged) redirect("/nx-control");

  const db = createAdminClient();

  // 1. Fetch active running timers
  const { data: activeTimers } = await db
    .from("time_entries")
    .select("id, started_at, note, employee_id, task_id, project_id, employees(id, full_name, avatar_url, job_title), tasks(id, title), projects(id, name)")
    .is("ended_at", null)
    .order("started_at", { ascending: false });

  // 2. Fetch all employees
  const { data: employees } = await db
    .from("employees")
    .select("id, full_name, job_title, status")
    .ilike("status", "active")
    .order("full_name");

  // 3. Fetch all tasks
  const { data: tasks } = await db
    .from("tasks")
    .select("id, title, status, priority, due_date, assigned_employee_id, project_id, projects(id, name), employees(id, full_name)")
    .order("created_at", { ascending: false });

  // 4. Fetch recent task & work audits
  const { data: audits } = await db
    .from("audit_log")
    .select("id, action, created_at, metadata, user_id")
    .in("action", ["task.status", "task.done", "task.create", "task.update", "worklog.create"])
    .order("created_at", { ascending: false })
    .limit(30);

  const empMap = new Map((employees ?? []).map((e) => [e.id, e]));

  // Build per-staff task summaries
  const staffSummaries = (employees ?? []).map((emp) => {
    const empTasks = (tasks ?? []).filter((t) => t.assigned_employee_id === emp.id);
    return {
      id: emp.id,
      name: emp.full_name,
      jobTitle: emp.job_title,
      todo: empTasks.filter((t) => t.status === "todo" || t.status === "backlog").length,
      doing: empTasks.filter((t) => t.status === "doing").length,
      review: empTasks.filter((t) => t.status === "review").length,
      done: empTasks.filter((t) => t.status === "done").length,
    };
  });

  const allTaskList = tasks ?? [];
  const activeTimerList = activeTimers ?? [];

  const totalTasks = allTaskList.length;
  const inProgressCount = allTaskList.filter((t) => t.status === "doing").length;
  const inReviewCount = allTaskList.filter((t) => t.status === "review").length;
  const doneCount = allTaskList.filter((t) => t.status === "done").length;

  // Format activity items
  const activityItems = (audits ?? []).map((a) => {
    const meta = (a.metadata ?? {}) as Record<string, any>;
    let summary = "";
    if (a.action === "task.status") {
      summary = `Moved "${meta.title || "task"}" from ${meta.from || "todo"} to ${(meta.to || "").toUpperCase()}`;
    } else if (a.action === "task.done") {
      summary = `Completed task "${meta.title || "task"}"`;
    } else if (a.action === "task.create") {
      summary = `Created new task "${meta.title || "task"}"`;
    } else if (a.action === "worklog.create") {
      summary = `Logged daily work progress`;
    } else {
      summary = `Updated task "${meta.title || "task"}"`;
    }

    return {
      id: a.id,
      actor_label: meta.by || meta.staffName || "Team Member",
      user_id: a.user_id,
      summary,
      created_at: a.created_at,
    };
  });

  return (
    <>
      <PageHead
        title="Staff Task Tracker & Live Activity"
        sub="Monitor staff task lifecycles, active working timers, review submissions, and daily task completion."
      />

      <div className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Working Now"
          value={String(activeTimerList.length)}
          hint="Active timers tracking"
          tone={activeTimerList.length > 0 ? "good" : "default"}
        />
        <Stat
          label="In Progress"
          value={String(inProgressCount)}
          hint="Tasks currently being worked"
        />
        <Stat
          label="Under Review"
          value={String(inReviewCount)}
          hint="Tasks ready for review"
          tone={inReviewCount > 0 ? "good" : "default"}
        />
        <Stat
          label="Tasks Completed"
          value={String(doneCount)}
          hint={`Out of ${totalTasks} total tasks`}
        />
      </div>

      <StaffActivityClient
        activeTimers={activeTimerList}
        staffSummaries={staffSummaries}
        recentActivity={activityItems}
        allTasks={allTaskList}
      />
    </>
  );
}
