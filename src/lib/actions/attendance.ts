"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/guards";
import { getCurrentStaff } from "@/lib/auth/staff";
import { agencyDay } from "@/lib/datetime";
import { workHoursFrom, judgeAttendance, type WorkHours } from "@/lib/workHours";
import { holidayMap } from "@/lib/actions/hr";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * Presence.
 *
 * Deliberately not the same thing as time tracking: a day can have attendance
 * and no billable work, and an hour of attendance is not an hour on a project.
 *
 * The employee is always derived from the session. Taking an id as an argument
 * would let anyone clock in as anyone.
 */

/** Working hours, from the singleton settings row. */
export async function getWorkHours(): Promise<WorkHours> {
  try {
    const { data } = await createAdminClient()
      .from("settings")
      .select("work_start, work_end, work_grace_min, work_days")
      .eq("id", 1)
      .maybeSingle();
    return workHoursFrom(data);
  } catch {
    // A pre-2027-26 database has none of those columns. Defaults are better
    // than a broken dashboard.
    return workHoursFrom(null);
  }
}

/** Is this person on approved leave on this date? */
export async function isOnLeave(employeeId: string, date: string): Promise<boolean> {
  try {
    const { data } = await createAdminClient()
      .from("leave_requests")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .lte("start_date", date)
      .gte("end_date", date)
      .limit(1);
    return !!data?.length;
  } catch {
    return false;
  }
}

export async function checkIn(note?: string) {
  const me = await requireStaff();
  const staff = await getCurrentStaff();
  if (!staff?.employeeId) {
    return { ok: false as const, error: "Your login is not linked to an employee record." };
  }

  const db = createAdminClient();
  const day = agencyDay();

  // `ignoreDuplicates` on the (employee_id, work_date) unique index. A second
  // check-in is a NO-OP, not a new arrival time — otherwise refreshing the page
  // at 11am would rewrite a 09:00 arrival, and the record would be worthless.
  const { error } = await db
    .from("attendance")
    .upsert(
      { employee_id: staff.employeeId, work_date: day, checked_in_at: new Date().toISOString() },
      { onConflict: "employee_id,work_date", ignoreDuplicates: true }
    );

  if (error) {
    return {
      ok: false as const,
      error:
        error.code === "42P01"
          ? "Attendance needs its table — run supabase/idempotent_fixes_2027_26.sql."
          : error.message,
    };
  }

  revalidatePath(`/${ADMIN}`);
  revalidatePath(`/${ADMIN}/attendance`);
  return { ok: true as const, ...(await todayFor(staff.employeeId)) };
}

export async function checkOut(note?: string) {
  await requireStaff();
  const staff = await getCurrentStaff();
  if (!staff?.employeeId) {
    return { ok: false as const, error: "Your login is not linked to an employee record." };
  }

  const db = createAdminClient();
  const day = agencyDay();

  const { data: row } = await db
    .from("attendance")
    .select("id, checked_in_at")
    .eq("employee_id", staff.employeeId)
    .eq("work_date", day)
    .maybeSingle();

  if (!row?.checked_in_at) {
    return { ok: false as const, error: "You have not checked in today." };
  }

  // Overwrites on purpose — the opposite rule to check-in. Leaving twice means
  // the later time is the one that is true.
  const { error } = await db
    .from("attendance")
    .update({
      checked_out_at: new Date().toISOString(),
      note: note?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/${ADMIN}`);
  revalidatePath(`/${ADMIN}/attendance`);
  return { ok: true as const, ...(await todayFor(staff.employeeId)) };
}

/** Today's row and its verdict, for the widget. */
export async function todayFor(employeeId: string) {
  const day = agencyDay();
  const db = createAdminClient();

  const [{ data: row }, hours, onLeave, holidays] = await Promise.all([
    db
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("work_date", day)
      .maybeSingle(),
    getWorkHours(),
    isOnLeave(employeeId, day),
    // A public holiday must never read as absent or late.
    holidayMap(day, day),
  ]);

  return {
    row: row ?? null,
    hours,
    verdict: judgeAttendance(row ?? null, hours, {
      date: new Date(),
      onLeave,
      holiday: holidays[day] ?? null,
    }),
  };
}

/** My own attendance for the widget — never takes an id from the caller. */
export async function myAttendanceToday() {
  const staff = await getCurrentStaff();
  if (!staff?.employeeId) return null;
  return todayFor(staff.employeeId);
}
