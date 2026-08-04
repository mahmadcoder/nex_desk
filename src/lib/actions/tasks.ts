"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { asUuid } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";
import { notify } from "@/lib/actions/notify";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * Handing work out.
 *
 * Staff already record what they did, afterwards, in `daily_work_logs`.
 * Nothing anywhere said what they should do next — that lived in WhatsApp,
 * which is fine for deciding and useless for remembering.
 *
 * Built to sit alongside the conversation rather than replace it, which is
 * why creating a task needs a title and nothing else, and why a task can be
 * closed from inside the work log a person was going to write anyway.
 */

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

export type TaskInput = {
  id?: string | null;
  projectId: string;
  title: string;
  description?: string | null;
  assignedEmployeeId?: string | null;
  dueDate?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
  status?: "backlog" | "todo" | "doing" | "review" | "done";
};

/**
 * Staff may only touch tasks on projects for clients they are assigned to.
 * Returns the task row when allowed, so callers do not fetch it twice.
 */
async function taskIfAllowed(taskId: string) {
  const me = await getCurrentStaff();
  if (!me) return { me: null, task: null, error: "Sign in first." };

  const db = createAdminClient();
  const { data: task } = await db
    .from("tasks")
    .select("*, projects(id, client_id, name)")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) return { me, task: null, error: "That task no longer exists." };

  if (!me.isPrivileged) {
    const allowed = await assignedClientIds(me.employeeId);
    const clientId = (task.projects as any)?.client_id;
    if (!clientId || !allowed.includes(clientId)) {
      return { me, task: null, error: "That task is not on one of your projects." };
    }
  }

  return { me, task, error: null };
}

/** Create or edit. Owner/admin only — handing out work is a management act. */
export async function saveTask(input: TaskInput): Promise<Result<{ id: string }>> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const projectId = asUuid(input.projectId);
  if (!projectId) return { ok: false, error: "Invalid project reference." };

  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Give the task a title." };

  const row = {
    project_id: projectId,
    title,
    description: input.description?.trim() || null,
    assigned_employee_id: asUuid(input.assignedEmployeeId ?? "") || null,
    due_date: input.dueDate || null,
    priority: input.priority ?? "normal",
    status: input.status ?? "todo",
  };

  const existingId = input.id ? asUuid(input.id) : null;

  // Read before writing, so "was this just handed to someone new?" can be
  // answered afterwards.
  let previousAssignee: string | null = null;
  if (existingId) {
    const { data: before } = await db
      .from("tasks").select("assigned_employee_id").eq("id", existingId).maybeSingle();
    previousAssignee = before?.assigned_employee_id ?? null;
  }

  const { data, error } = existingId
    ? await db.from("tasks").update(row).eq("id", existingId).select().single()
    : await db.from("tasks")
        .insert({ ...row, created_by: me.userId })
        .select()
        .single();

  if (error || !data) {
    console.error("saveTask failed:", error);
    return {
      ok: false,
      error:
        error?.code === "42703" || error?.code === "42P01"
          ? "The tasks table is not ready — run supabase/idempotent_fixes_2027_09.sql."
          : error?.message || "Could not save that task.",
    };
  }

  await recordAudit(me.userId, existingId ? "task.update" : "task.create", "tasks", data.id, {
    title,
    assigned: row.assigned_employee_id,
  });

  // Tell the person, but only when the assignment is actually new to them.
  // Editing a typo on a task somebody already has is not news, and a board
  // that pings on every keystroke gets muted.
  const assignedToSomeoneNew =
    !!row.assigned_employee_id &&
    (!existingId || previousAssignee !== row.assigned_employee_id);

  if (assignedToSomeoneNew) {
    const { data: project } = await db
      .from("projects").select("name").eq("id", projectId).maybeSingle();

    await notify({
      kind: "task.assigned",
      title: `New task: ${title}`,
      body: [project?.name, row.due_date ? `due ${row.due_date}` : null]
        .filter(Boolean)
        .join(" · ") || undefined,
      href: `/${ADMIN}/projects/${projectId}`,
      entity: "tasks",
      entityId: data.id,
      actorLabel: me.fullName ?? null,
      actorKind: "staff",
      employeeId: row.assigned_employee_id,
    });
  }

  revalidatePath(`/${ADMIN}/projects/${projectId}`);
  revalidatePath(`/${ADMIN}`);
  return { ok: true, id: data.id };
}

/**
 * Tick it off, or put it back.
 *
 * Open to staff, not just admins — the person doing the work is the one who
 * knows it is finished, and making them ask an admin to tick it is how a board
 * goes stale.
 */
export async function toggleTask(
  taskId: string,
  done: boolean
): Promise<Result<{ status: string }>> {
  const id = asUuid(taskId);
  if (!id) return { ok: false, error: "Invalid task reference." };

  const { me, task, error: guardError } = await taskIfAllowed(id);
  if (!me || !task) return { ok: false, error: guardError ?? "Not allowed." };

  const db = createAdminClient();
  const { error } = await db.from("tasks").update({
    status: done ? "done" : "todo",
    done_at: done ? new Date().toISOString() : null,
    done_by: done ? me.employeeId : null,
    // Cleared on reopen so a reopened task is not still credited to an old log.
    done_via_log_id: done ? task.done_via_log_id : null,
  }).eq("id", id);

  if (error) return { ok: false, error: error.message };

  await recordAudit(me.userId, done ? "task.done" : "task.reopen", "tasks", id, {
    title: task.title,
  });

  revalidatePath(`/${ADMIN}/projects/${task.project_id}`);
  revalidatePath(`/${ADMIN}`);
  return { ok: true, status: done ? "done" : "todo" };
}

/** Move a task along the board without opening the edit form. */
export async function setTaskStatus(
  taskId: string,
  status: "backlog" | "todo" | "doing" | "review" | "done"
): Promise<Result> {
  const id = asUuid(taskId);
  if (!id) return { ok: false, error: "Invalid task reference." };

  const { me, task, error: guardError } = await taskIfAllowed(id);
  if (!me || !task) return { ok: false, error: guardError ?? "Not allowed." };

  const db = createAdminClient();
  const { error } = await db.from("tasks").update({
    status,
    done_at: status === "done" ? new Date().toISOString() : null,
    done_by: status === "done" ? me.employeeId : null,
  }).eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${ADMIN}/projects/${task.project_id}`);
  revalidatePath(`/${ADMIN}`);
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<Result> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(taskId);
  if (!id) return { ok: false, error: "Invalid task reference." };

  const { data: task } = await db
    .from("tasks").select("title, project_id").eq("id", id).maybeSingle();
  if (!task) return { ok: false, error: "That task no longer exists." };

  const { error } = await db.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await recordAudit(me.userId, "task.delete", "tasks", id, { title: task.title });
  revalidatePath(`/${ADMIN}/projects/${task.project_id}`);
  return { ok: true };
}

/**
 * The open tasks a staff member can tick off while writing today's log.
 *
 * Scoped to the signed-in employee, so the work-log form only ever offers
 * someone their own work.
 */
export async function myOpenTasks(
  projectId?: string
): Promise<{ id: string; title: string; project_id: string; due_date: string | null }[]> {
  const me = await getCurrentStaff();
  if (!me?.employeeId) return [];

  const db = createAdminClient();
  let q = db
    .from("tasks")
    .select("id, title, project_id, due_date")
    .eq("assigned_employee_id", me.employeeId)
    .neq("status", "done")
    .order("due_date", { nullsFirst: false })
    .limit(50);

  const pid = projectId ? asUuid(projectId) : null;
  if (pid) q = q.eq("project_id", pid);

  const { data, error } = await q;
  if (error) {
    // Never break the work-log form over this — it is an optional convenience
    // bolted onto something people must always be able to submit.
    console.error("myOpenTasks failed:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Closes tasks as part of submitting a work log.
 *
 * This is the whole reason the board can be trusted: it updates itself from
 * something staff already do, instead of asking them to keep a second system
 * in sync by hand.
 */
export async function closeTasksFromLog(
  taskIds: string[],
  logId?: string | null
): Promise<Result<{ closed: number }>> {
  const me = await getCurrentStaff();
  if (!me?.employeeId) return { ok: false, error: "Sign in first." };

  const ids = taskIds.map((t) => asUuid(t)).filter(Boolean) as string[];
  if (!ids.length) return { ok: true, closed: 0 };

  const db = createAdminClient();

  // Only ever the caller's own tasks, whatever ids were posted.
  const { data, error } = await db.from("tasks").update({
    status: "done",
    done_at: new Date().toISOString(),
    done_by: me.employeeId,
    done_via_log_id: asUuid(logId ?? "") || null,
  })
    .in("id", ids)
    .eq("assigned_employee_id", me.employeeId)
    .select("id");

  if (error) {
    console.error("closeTasksFromLog failed:", error);
    return { ok: false, error: "The log was saved, but the tasks could not be ticked off." };
  }

  revalidatePath(`/${ADMIN}`);
  revalidatePath(`/${ADMIN}/daily-logs`);
  return { ok: true, closed: data?.length ?? 0 };
}
