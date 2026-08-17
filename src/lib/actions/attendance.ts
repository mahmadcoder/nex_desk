"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStaff, requireOwnerAdmin } from "@/lib/auth/guards";
import { getCurrentStaff } from "@/lib/auth/staff";
import { recordAudit } from "@/lib/actions/audit";
import { agencyDay, AGENCY_TZ } from "@/lib/datetime";
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

import { notify } from "@/lib/actions/notify";
import { fmtTime } from "@/lib/datetime";

export async function checkIn(note?: string) {
  const me = await requireStaff();
  const staff = await getCurrentStaff();
  if (!staff?.employeeId) {
    return { ok: false as const, error: "Your login is not linked to an employee record." };
  }

  const db = createAdminClient();
  const day = agencyDay();

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

  const todayData = await todayFor(staff.employeeId);
  if (todayData.verdict.status === "late") {
    await notify({
      kind: "staff.late",
      title: `Late Attendance: ${staff.fullName} checked in ${todayData.verdict.lateBy}m late`,
      body: `Arrival: ${fmtTime(new Date().toISOString())} (Scheduled: ${todayData.hours.start})`,
      href: `/${ADMIN}/attendance`,
      actorKind: "staff",
    }).catch(() => null);
  }

  revalidatePath(`/${ADMIN}`);
  revalidatePath(`/${ADMIN}/attendance`);
  return { ok: true as const, ...todayData };
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

/* ============================================================
   ADMIN CORRECTIONS
   ============================================================ */

/**
 * Everything below takes an `employeeId`, and everything above deliberately
 * does not. That is the whole reason these are separate functions rather than
 * an optional argument on `checkIn`: the moment self-service accepts an id,
 * one missing guard means anybody can clock in as anybody.
 *
 * Every correction requires a reason and is written to the audit log. An
 * edited day has to be visibly different from a day somebody actually clocked.
 */

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * How many minutes the agency zone runs ahead of UTC at a given instant.
 *
 * The date parts have to come back from Intl along with the time. Comparing
 * only hours and minutes looks like it works and then fails at the edges of the
 * day: 23:50 formats as 04:50 *the next morning*, and reading that as a
 * same-day difference makes the zone look nineteen hours behind UTC.
 */
function zoneOffsetMin(at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: AGENCY_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  ) as Record<string, string>;

  const wall = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    // Intl renders midnight as "24" in some engines.
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );

  return (wall - at.getTime()) / 60_000;
}

/**
 * "09:12" on a given agency-local day → the instant to store.
 *
 * Not `new Date("2026-08-06T09:12")`, which the server reads as UTC and stores
 * five hours out. The offset is resolved for that specific date, so a zone with
 * a half-hour offset or a daylight-saving shift still lands on the right
 * moment.
 */
function atAgencyTime(day: string, hm: string): string {
  const [y, mo, d] = day.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);

  const wall = Date.UTC(y, mo - 1, d, h, mi);

  // Two passes. The first offset is measured at roughly the right instant; if
  // the guess happens to straddle a DST boundary the second measurement
  // disagrees, and that one is taken instead.
  const first = zoneOffsetMin(new Date(wall));
  let result = wall - first * 60_000;

  const second = zoneOffsetMin(new Date(result));
  if (second !== first) result = wall - second * 60_000;

  return new Date(result).toISOString();
}

export async function adminSetAttendance(input: {
  employeeId: string;
  /** YYYY-MM-DD, agency local. */
  date: string;
  /** "09:12", or empty to leave unset. */
  inAt?: string | null;
  outAt?: string | null;
  /** Asserts the day when there are no times to give. */
  status?: "present" | "absent" | null;
  reason: string;
}) {
  const me = await requireOwnerAdmin();

  const reason = input.reason?.trim();
  if (!reason) {
    return { ok: false as const, error: "Say why this is being changed — it goes on the record." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { ok: false as const, error: "That date is not valid." };
  }

  const inHm = input.inAt?.trim() || "";
  const outHm = input.outAt?.trim() || "";
  if (inHm && !HHMM.test(inHm)) return { ok: false as const, error: "Arrival must look like 09:00." };
  if (outHm && !HHMM.test(outHm)) return { ok: false as const, error: "Leaving must look like 18:00." };
  if (inHm && outHm && outHm <= inHm) {
    // Compared as strings, which is safe for zero-padded HH:MM and avoids
    // pretending we support a shift running past midnight — we do not, and a
    // silently accepted negative duration would be worse than this message.
    return { ok: false as const, error: "Leaving has to be after arriving." };
  }
  if (!inHm && !input.status) {
    return {
      ok: false as const,
      error: "Give an arrival time, or mark the day present or absent.",
    };
  }
  if (outHm && !inHm) {
    return { ok: false as const, error: "A leaving time needs an arrival time to sit against." };
  }

  const db = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await db.from("attendance").upsert(
    {
      employee_id: input.employeeId,
      work_date: input.date,
      checked_in_at: inHm ? atAgencyTime(input.date, inHm) : null,
      checked_out_at: outHm ? atAgencyTime(input.date, outHm) : null,
      status_override: input.status ?? null,
      edit_reason: reason,
      edited_by: me.userId,
      edited_at: now,
      updated_at: now,
    },
    { onConflict: "employee_id,work_date" }
  );

  if (error) {
    return {
      ok: false as const,
      error:
        error.code === "42703"
          ? "Attendance needs its override columns — run supabase/idempotent_fixes_2027_35.sql."
          : error.code === "42P01"
            ? "Attendance needs its table — run supabase/idempotent_fixes_2027_26.sql."
            : error.message,
    };
  }

  await recordAudit(me.userId, "attendance.override", "attendance", null, {
    employee_id: input.employeeId,
    date: input.date,
    in: inHm || null,
    out: outHm || null,
    marked: input.status ?? null,
    reason,
  });

  revalidatePath(`/${ADMIN}`);
  revalidatePath(`/${ADMIN}/attendance`);
  return { ok: true as const };
}

/** Back to no record at all — the day reads however the rules say it should. */
export async function adminClearAttendance(employeeId: string, date: string, reason: string) {
  const me = await requireOwnerAdmin();

  const why = reason?.trim();
  if (!why) return { ok: false as const, error: "Say why this is being cleared." };

  const { error } = await createAdminClient()
    .from("attendance")
    .delete()
    .eq("employee_id", employeeId)
    .eq("work_date", date);

  if (error) return { ok: false as const, error: error.message };

  await recordAudit(me.userId, "attendance.override", "attendance", null, {
    employee_id: employeeId,
    date,
    cleared: true,
    reason: why,
  });

  revalidatePath(`/${ADMIN}`);
  revalidatePath(`/${ADMIN}/attendance`);
  return { ok: true as const };
}

import { computeMonthlyOvertimeSummary, type MonthlyOvertimeSummary } from "@/lib/overtime";

/**
 * Returns the signed-in staff member's overtime & late deficit summary for a given month.
 */
export async function getMyOvertimeSummary(periodMonth?: string): Promise<MonthlyOvertimeSummary | null> {
  const me = await getCurrentStaff();
  if (!me?.employeeId) return null;

  const db = createAdminClient();
  const period = String(periodMonth || new Date().toISOString()).slice(0, 7);
  const startDay = `${period}-01`;
  const endDay = `${period}-31`;

  const [{ data: employee }, { data: attendance }, hours, holidays] = await Promise.all([
    db
      .from("employees")
      .select("id, full_name, salary_amount, salary_currency")
      .eq("id", me.employeeId)
      .maybeSingle(),
    db
      .from("attendance")
      .select("*")
      .eq("employee_id", me.employeeId)
      .gte("work_date", startDay)
      .lte("work_date", endDay)
      .order("work_date", { ascending: true }),
    getWorkHours(),
    holidayMap(startDay, endDay),
  ]);

  const { data: leaves } = await db
    .from("leave_requests")
    .select("start_date, end_date")
    .eq("employee_id", me.employeeId)
    .eq("status", "approved")
    .lte("start_date", endDay)
    .gte("end_date", startDay);

  const leaveDays = new Set<string>();
  for (const l of leaves ?? []) {
    const s = new Date(l.start_date);
    const e = new Date(l.end_date);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      leaveDays.add(d.toISOString().slice(0, 10));
    }
  }

  return computeMonthlyOvertimeSummary({
    periodMonth: period,
    attendanceRows: attendance ?? [],
    hours,
    salaryAmount: Number(employee?.salary_amount || 0),
    salaryCurrency: employee?.salary_currency || "USD",
    leaveDays,
    holidays,
  });
}

/**
 * Returns overtime summaries for all active employees for a given month. Owner/Admin only.
 */
export async function getTeamOvertimeSummary(periodMonth?: string) {
  await requireOwnerAdmin();
  const db = createAdminClient();
  const period = String(periodMonth || new Date().toISOString()).slice(0, 7);
  const startDay = `${period}-01`;
  const endDay = `${period}-31`;

  const [{ data: employees }, { data: allAttendance }, hours, holidays, { data: allLeaves }] =
    await Promise.all([
      db
        .from("employees")
        .select("id, full_name, avatar_url, job_title, salary_amount, salary_currency, status")
        .ilike("status", "active")
        .order("full_name"),
      db
        .from("attendance")
        .select("*")
        .gte("work_date", startDay)
        .lte("work_date", endDay),
      getWorkHours(),
      holidayMap(startDay, endDay),
      db
        .from("leave_requests")
        .select("employee_id, start_date, end_date")
        .eq("status", "approved")
        .lte("start_date", endDay)
        .gte("end_date", startDay),
    ]);

  const attendanceByEmp = new Map<string, any[]>();
  for (const a of allAttendance ?? []) {
    if (!attendanceByEmp.has(a.employee_id)) {
      attendanceByEmp.set(a.employee_id, []);
    }
    attendanceByEmp.get(a.employee_id)!.push(a);
  }

  const leavesByEmp = new Map<string, Set<string>>();
  for (const l of allLeaves ?? []) {
    if (!leavesByEmp.has(l.employee_id)) {
      leavesByEmp.set(l.employee_id, new Set());
    }
    const set = leavesByEmp.get(l.employee_id)!;
    const s = new Date(l.start_date);
    const e = new Date(l.end_date);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      set.add(d.toISOString().slice(0, 10));
    }
  }

  const results = (employees ?? []).map((emp) => {
    const summary = computeMonthlyOvertimeSummary({
      periodMonth: period,
      attendanceRows: attendanceByEmp.get(emp.id) ?? [],
      hours,
      salaryAmount: Number(emp.salary_amount || 0),
      salaryCurrency: emp.salary_currency || "USD",
      leaveDays: leavesByEmp.get(emp.id) ?? new Set(),
      holidays,
    });

    return {
      employee: emp,
      summary,
    };
  });

  return results;
}
