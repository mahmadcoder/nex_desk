"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { asUuid } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";
import { notify } from "@/lib/actions/notify";
import { fmtDate } from "@/lib/datetime";

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
      body: [project?.name, row.due_date ? `due ${fmtDate(row.due_date)}` : null]
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
  // The board is now a place tasks are created and reassigned, not only a
  // place they are looked at, so it has to be invalidated like the project page.
  revalidatePath(`/${ADMIN}/tasks`);
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
    by: me.fullName,
  });

  if (done) {
    await notify({
      kind: "task.assigned",
      title: `${me.fullName} completed task: "${task.title}"`,
      body: `Project: ${(task.projects as any)?.name || "Project"} · Marked as Done`,
      href: `/${ADMIN}/projects/${task.project_id}?tab=tasks`,
      entity: "tasks",
      entityId: id,
      actorKind: "staff",
      actorLabel: me.fullName ?? null,
    }).catch(() => null);
  }

  revalidatePath(`/${ADMIN}/projects/${task.project_id}`);
  revalidatePath(`/${ADMIN}/tasks`);
  revalidatePath(`/${ADMIN}/staff-activity`);
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

  await recordAudit(me.userId, "task.status", "tasks", id, {
    title: task.title,
    from: task.status,
    to: status,
    by: me.fullName,
  });

  // Notify Admins on significant task status changes
  const statusLabel =
    status === "doing"
      ? "IN PROGRESS"
      : status === "review"
        ? "READY FOR REVIEW"
        : status === "done"
          ? "DONE"
          : status.toUpperCase();

  if (status === "doing" || status === "review" || status === "done") {
    await notify({
      kind: "task.assigned",
      title: `${me.fullName} moved "${task.title}" to ${statusLabel}`,
      body: `Project: ${(task.projects as any)?.name || "Project"}`,
      href: `/${ADMIN}/projects/${task.project_id}?tab=tasks`,
      entity: "tasks",
      entityId: id,
      actorKind: "staff",
      actorLabel: me.fullName ?? null,
    }).catch(() => null);
  }

  revalidatePath(`/${ADMIN}/projects/${task.project_id}`);
  revalidatePath(`/${ADMIN}/tasks`);
  revalidatePath(`/${ADMIN}/staff-activity`);
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

/* ============================================================
   PROJECT RATINGS
   ============================================================ */

/**
 * Score a team member on a delivered project.
 *
 * Owner/admin only, and captured at handover — the one moment the work is
 * finished and still fresh enough to judge honestly.
 *
 * Upserts on (project_id, employee_id): re-rating corrects the score rather
 * than stacking a second one, so an average cannot be moved by rating the same
 * project twice.
 */
export async function rateTeamMember(
  projectId: string,
  employeeId: string,
  score: number,
  note?: string
): Promise<Result> {
  const me = await requireOwnerAdmin();

  const clamped = Math.round(Number(score));
  if (!Number.isFinite(clamped) || clamped < 1 || clamped > 5) {
    return { ok: false, error: "A score has to be between 1 and 5." };
  }

  const { error } = await createAdminClient()
    .from("project_ratings")
    .upsert(
      {
        project_id: projectId,
        employee_id: employeeId,
        score: clamped,
        note: note?.trim() || null,
        rated_by: me.userId,
      },
      { onConflict: "project_id,employee_id" }
    );

  if (error) {
    return {
      ok: false,
      error:
        error.code === "42P01"
          ? "Ratings need their table — run supabase/idempotent_fixes_2027_27.sql."
          : error.message,
    };
  }

  await recordAudit(me.userId, "project.rate", "projects", projectId, { employeeId, score: clamped });
  revalidatePath(`/${ADMIN}/projects/${projectId}`);
  return { ok: true };
}

/** Existing scores for a project, for the rating panel. Owner/admin only. */
export async function projectRatings(projectId: string) {
  await requireOwnerAdmin();
  const { data, error } = await createAdminClient()
    .from("project_ratings")
    .select("employee_id, score, note")
    .eq("project_id", projectId);

  if (error) {
    if (error.code !== "42P01") console.error("projectRatings failed", error);
    return [];
  }
  return data ?? [];
}

/* ============================================================
   PROJECT ARCHIVE
   ============================================================ */

/**
 * Hide a finished project from the default list, or bring it back.
 *
 * Deliberately separate from `status`. A completed project that is still being
 * invoiced must stay visible, and a paused one that nobody wants to look at
 * should be hideable without lying about its status.
 */
export async function setProjectArchived(projectId: string, archived: boolean): Promise<Result> {
  const me = await requireOwnerAdmin();

  const { error } = await createAdminClient()
    .from("projects")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", projectId);

  if (error) {
    return {
      ok: false,
      error:
        error.code === "42703"
          ? "Archiving needs its column — run supabase/idempotent_fixes_2027_31.sql."
          : error.message,
    };
  }

  await recordAudit(me.userId, archived ? "project.archive" : "project.restore", "projects", projectId);
  revalidatePath(`/${ADMIN}/projects`);
  revalidatePath(`/${ADMIN}/projects/${projectId}`);
  return { ok: true };
}

/* ============================================================
   RECURRING TASKS
   ============================================================ */

/**
 * Turn a task into a recurring template, or stop it recurring.
 *
 * The template itself is never worked on — it is excluded from every board and
 * count. The alternative, reopening a finished task each week, destroys the
 * record of what was actually done when.
 */
export async function setTaskRecurrence(
  taskId: string,
  recurrence: "daily" | "weekly" | "monthly" | null,
  until?: string | null
): Promise<Result> {
  const me = await requireOwnerAdmin();
  const id = asUuid(taskId);
  if (!id) return { ok: false, error: "Invalid task reference." };

  const { data, error } = await createAdminClient()
    .from("tasks")
    .update({
      recurrence,
      recurrence_until: recurrence ? until || null : null,
      is_recurring_template: !!recurrence,
      // Seeded to today so the first occurrence lands on the NEXT period rather
      // than immediately duplicating the task somebody just wrote.
      last_spawned_on: recurrence ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq("id", id)
    .select("project_id")
    .single();

  if (error) {
    return {
      ok: false,
      error:
        error.code === "42703"
          ? "Recurring tasks need their columns — run supabase/idempotent_fixes_2027_31.sql."
          : error.message,
    };
  }

  await recordAudit(me.userId, "task.recurrence", "tasks", id, { recurrence });
  revalidatePath(`/${ADMIN}/projects/${data.project_id}`);
  revalidatePath(`/${ADMIN}/tasks`);
  return { ok: true };
}

/** The next occurrence after `from`, for a given rule. */
function nextOccurrence(from: Date, rule: string): Date {
  const d = new Date(from);
  if (rule === "daily") d.setDate(d.getDate() + 1);
  else if (rule === "weekly") d.setDate(d.getDate() + 7);
  // setMonth handles the short-month case: 31 Jan + 1 month lands on 2 or 3
  // March, which is wrong but predictable — clamped below.
  else if (rule === "monthly") {
    const day = d.getDate();
    d.setMonth(d.getMonth() + 1);
    if (d.getDate() < day) d.setDate(0);
  }
  return d;
}

/**
 * Create any occurrences that are due. Called by the daily cron.
 *
 * Idempotent through `last_spawned_on`: running it twice in one day produces
 * nothing the second time, which matters because a manual re-trigger of the
 * cron would otherwise duplicate every recurring task in the agency.
 */
export async function materialiseRecurringTasks(): Promise<number> {
  const db = createAdminClient();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const { data: templates, error } = await db
    .from("tasks")
    .select("*")
    .eq("is_recurring_template", true);

  if (error) {
    if (error.code !== "42703") console.error("materialiseRecurringTasks failed", error);
    return 0;
  }

  let made = 0;

  for (const t of templates ?? []) {
    if (t.recurrence_until && t.recurrence_until < todayIso) continue;

    const last = t.last_spawned_on ? new Date(t.last_spawned_on) : new Date(t.created_at);
    const due = nextOccurrence(last, t.recurrence);
    if (due > today) continue;

    const dueIso = due.toISOString().slice(0, 10);

    const { error: insErr } = await db.from("tasks").insert({
      project_id: t.project_id,
      milestone_id: t.milestone_id,
      title: t.title,
      description: t.description,
      status: "todo",
      priority: t.priority,
      assigned_to: t.assigned_to,
      assigned_employee_id: t.assigned_employee_id,
      due_date: dueIso,
      is_internal: t.is_internal,
      spawned_from: t.id,
    });

    if (insErr) {
      console.error("Could not spawn recurring task", t.id, insErr);
      continue;
    }

    // Stamped only after the copy exists, so a failure retries tomorrow rather
    // than silently skipping an occurrence.
    await db.from("tasks").update({ last_spawned_on: dueIso }).eq("id", t.id);
    made++;
  }

  return made;
}
