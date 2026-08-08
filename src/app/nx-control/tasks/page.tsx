import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { PageHead } from "@/components/admin/ui";
import TaskBoard from "@/components/admin/TaskBoard";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

/**
 * The task board.
 *
 * Staff see only what is assigned to them; admin sees everything with an
 * employee filter. Both enforced in the query — a column that is merely hidden
 * is not scoping, and `setTaskStatus` re-checks on every move anyway.
 */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string }>;
}) {
  const me = await getCurrentStaff();
  if (!me) return null;

  const db = createAdminClient();
  const canManage = me.isPrivileged;
  const { who } = await searchParams;

  let q = db
    .from("tasks")
    .select(
      "id, title, description, status, priority, due_date, project_id, assigned_employee_id, sort_order, projects(id, name, client_id)"
    )
    // A template is the RULE, not work — it never appears on a board.
    .eq("is_recurring_template", false)
    .order("due_date", { nullsFirst: false })
    .order("sort_order")
    .limit(400);

  if (!canManage) {
    // Their own work only. Fails closed — no employee row means no tasks.
    q = q.eq("assigned_employee_id", me.employeeId ?? "00000000-0000-0000-0000-000000000000");
  } else if (who) {
    q = q.eq("assigned_employee_id", who);
  }

  const [{ data: tasks, error }, { data: employees }] = await Promise.all([
    q,
    canManage
      ? db.from("employees").select("id, full_name").neq("status", "Terminated").order("full_name")
      : Promise.resolve({ data: [] as any[] }),
  ]);

  if (error) {
    console.error("tasks board failed", error);
  }

  let rows = tasks ?? [];

  // Staff must not see a task on a client they were unassigned from, even if
  // the task still names them. The same rule `taskIfAllowed` applies on write.
  if (!canManage) {
    const allowed = await assignedClientIds(me.employeeId);
    rows = rows.filter((t: any) => !t.projects?.client_id || allowed.includes(t.projects.client_id));
  }

  // Attachment counts, in one query rather than one per card.
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

  const nameOf = new Map((employees ?? []).map((e: any) => [e.id, e.full_name]));

  const cards = rows.map((t: any) => ({
    ...t,
    attachmentCount: counts.get(t.id) ?? 0,
    assignee: canManage ? nameOf.get(t.assigned_employee_id) ?? null : null,
  }));

  return (
    <>
      <PageHead
        title={canManage ? "Task board" : "My tasks"}
        sub={
          canManage
            ? "Every task across the agency. Move a card with the arrows — it saves immediately."
            : "Work assigned to you. Move a card with the arrows as you go."
        }
      />

      {canManage && (employees?.length ?? 0) > 0 && (
        <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
          <Filter href="/nx-control/tasks" label="Everyone" active={!who} />
          {(employees ?? []).map((e: any) => (
            <Filter
              key={e.id}
              href={`/nx-control/tasks?who=${e.id}`}
              label={e.full_name}
              active={who === e.id}
            />
          ))}
        </div>
      )}

      {!cards.length ? (
        <p className="card p-8 text-center text-sm text-bone-400">
          {canManage
            ? "No tasks yet. Add them from a project."
            : "Nothing assigned to you right now."}
        </p>
      ) : (
        <TaskBoard tasks={cards} />
      )}
    </>
  );
}

function Filter({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`mono-tag shrink-0 rounded-lg border px-3 py-1.5 text-[11px] ${
        active
          ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
          : "border-ink-600 text-bone-400 hover:text-bone-100"
      }`}
    >
      {label}
    </Link>
  );
}
