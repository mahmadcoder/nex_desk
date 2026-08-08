"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/guards";
import { getCurrentStaff } from "@/lib/auth/staff";
import { agencyDay } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * Where the hours went.
 *
 * Pause is implemented as **stop-and-start**, not as a paused flag. A row is
 * therefore always either running or finished, and a browser that crashes
 * mid-session cannot leave a timer paused forever with nobody able to tell
 * whether it should be counted.
 *
 * Only one entry may run per person, and that is enforced by a partial unique
 * index rather than by a disabled button — two tabs, or a stale page, and the
 * button is not there to say no.
 */

async function meOrFail() {
  await requireStaff();
  const staff = await getCurrentStaff();
  if (!staff?.employeeId) {
    return { employeeId: null, error: "Your login is not linked to an employee record." };
  }
  return { employeeId: staff.employeeId, error: null };
}

function describe(error: any) {
  if (error?.code === "42P01") {
    return "Time tracking needs its table — run supabase/idempotent_fixes_2027_26.sql.";
  }
  // 23505 on the partial unique index = a timer is already running.
  if (error?.code === "23505") {
    return "A timer is already running. Stop it before starting another.";
  }
  return error?.message ?? "Could not do that.";
}

export async function startTimer(input: {
  taskId?: string | null;
  projectId?: string | null;
  note?: string | null;
}) {
  const { employeeId, error: who } = await meOrFail();
  if (!employeeId) return { ok: false as const, error: who! };

  const db = createAdminClient();

  // Resolve the project from the task when only a task was given, so a report
  // grouped by project never drops task time.
  let projectId = input.projectId ?? null;
  if (!projectId && input.taskId) {
    const { data: task } = await db
      .from("tasks")
      .select("project_id")
      .eq("id", input.taskId)
      .maybeSingle();
    projectId = task?.project_id ?? null;
  }

  const { data, error } = await db
    .from("time_entries")
    .insert({
      employee_id: employeeId,
      task_id: input.taskId || null,
      project_id: projectId,
      note: input.note?.trim() || null,
      source: "timer",
    })
    .select("id, started_at")
    .single();

  if (error) return { ok: false as const, error: describe(error) };

  revalidatePath(`/${ADMIN}`);
  return { ok: true as const, id: data.id, startedAt: data.started_at };
}

/**
 * Stop whatever is running.
 *
 * Used for both Stop and Pause — the difference is only whether the caller
 * starts a new entry afterwards.
 */
export async function stopTimer(note?: string) {
  const { employeeId, error: who } = await meOrFail();
  if (!employeeId) return { ok: false as const, error: who! };

  const db = createAdminClient();

  const { data: running } = await db
    .from("time_entries")
    .select("id, started_at, task_id, project_id")
    .eq("employee_id", employeeId)
    .is("ended_at", null)
    .maybeSingle();

  if (!running) return { ok: false as const, error: "No timer is running." };

  const endedAt = new Date();
  const durationSec = Math.max(
    0,
    Math.round((endedAt.getTime() - new Date(running.started_at).getTime()) / 1000)
  );

  const { error } = await db
    .from("time_entries")
    .update({
      ended_at: endedAt.toISOString(),
      duration_sec: durationSec,
      ...(note?.trim() ? { note: note.trim() } : {}),
    })
    .eq("id", running.id);

  if (error) return { ok: false as const, error: describe(error) };

  revalidatePath(`/${ADMIN}`);
  revalidatePath(`/${ADMIN}/timesheets`);
  return {
    ok: true as const,
    durationSec,
    /** Handed back so Resume can restart on the same task without a round trip. */
    taskId: running.task_id,
    projectId: running.project_id,
  };
}

/** Stop the current segment and immediately begin a new one on the same work. */
export async function resumeTimer(taskId?: string | null, projectId?: string | null) {
  return startTimer({ taskId: taskId ?? null, projectId: projectId ?? null });
}

/** The running entry, if there is one. */
export async function runningTimer() {
  const staff = await getCurrentStaff();
  if (!staff?.employeeId) return null;

  const { data, error } = await createAdminClient()
    .from("time_entries")
    .select("id, started_at, note, task_id, project_id, tasks(title), projects(name)")
    .eq("employee_id", staff.employeeId)
    .is("ended_at", null)
    .maybeSingle();

  if (error) {
    if (error.code !== "42P01") console.error("runningTimer failed", error);
    return null;
  }
  return data;
}

/**
 * Seconds tracked by one employee on one day.
 *
 * Excludes a still-running entry: a total that grows while you read it cannot
 * be written into a daily log, and half a session is not a fact yet.
 */
export async function trackedSecondsOn(employeeId: string, day = agencyDay()) {
  const start = new Date(`${day}T00:00:00`);
  const end = new Date(`${day}T23:59:59.999`);

  const { data, error } = await createAdminClient()
    .from("time_entries")
    .select("duration_sec")
    .eq("employee_id", employeeId)
    .not("ended_at", "is", null)
    .gte("started_at", start.toISOString())
    .lte("started_at", end.toISOString());

  if (error) {
    if (error.code !== "42P01") console.error("trackedSecondsOn failed", error);
    return 0;
  }
  return (data ?? []).reduce((s, r: any) => s + Number(r.duration_sec ?? 0), 0);
}

/** My own tracked total for today, for the daily-log pre-fill. */
export async function myTrackedToday() {
  const staff = await getCurrentStaff();
  if (!staff?.employeeId) return 0;
  return trackedSecondsOn(staff.employeeId);
}

/**
 * Close timers nobody stopped.
 *
 * Called by the daily cron. An entry still running after `maxHours` is almost
 * certainly a forgotten stop, and billing a client nineteen hours because
 * somebody shut their laptop is worse than billing too few — so it is capped
 * and marked `manual`, which makes it visible on the timesheet rather than
 * silently correct-looking.
 */
export async function closeStaleTimers(maxHours = 12) {
  const db = createAdminClient();
  const cutoff = new Date(Date.now() - maxHours * 3600_000).toISOString();

  const { data: stale, error } = await db
    .from("time_entries")
    .select("id, started_at")
    .is("ended_at", null)
    .lt("started_at", cutoff);

  if (error) {
    if (error.code !== "42P01") console.error("closeStaleTimers failed", error);
    return 0;
  }

  for (const e of stale ?? []) {
    const ended = new Date(new Date(e.started_at).getTime() + maxHours * 3600_000);
    await db
      .from("time_entries")
      .update({
        ended_at: ended.toISOString(),
        duration_sec: maxHours * 3600,
        source: "manual",
        note: `Auto-closed after ${maxHours}h — the timer was never stopped.`,
      })
      .eq("id", e.id);
  }

  return (stale ?? []).length;
}
