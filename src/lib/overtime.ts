import { type WorkHours, parseHm, isWorkingDay, judgeAttendance } from "@/lib/workHours";
import { daysInMonth } from "@/lib/payroll";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type DailyOvertimeDetail = {
  date: string;
  isWorkDay: boolean;
  status: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  presentSec: number;
  expectedShiftSec: number;
  lateMin: number;
  lateDeficitSec: number;
  extraSec: number;
  netDailyBalanceSec: number;
};

export type MonthlyOvertimeSummary = {
  periodMonth: string;
  totalWorkingDays: number;
  scheduledDailyHours: number;
  totalExtraSec: number;
  totalLateDeficitSec: number;
  recoveredDeficitSec: number;
  netOvertimeSec: number;
  unrecoveredDeficitSec: number;
  hourlyRate: number;
  overtimeMultiplier: number;
  overtimePay: number;
  currency: string;
  days: DailyOvertimeDetail[];
};

/**
 * Calculates working days in a month according to agency WorkHours.
 */
export function countWorkingDaysInMonth(year: number, monthZeroIndexed: number, hours: WorkHours): number {
  const totalDays = new Date(year, monthZeroIndexed + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(Date.UTC(year, monthZeroIndexed, d));
    if (isWorkingDay(date, hours)) {
      count++;
    }
  }
  return Math.max(1, count);
}

/**
 * Evaluates daily overtime and late deficit for a given day and attendance row.
 */
export function evaluateDailyOvertime(
  dateIso: string,
  row: any,
  hours: WorkHours,
  onLeave = false,
  holidayLabel?: string | null
): DailyOvertimeDetail {
  const isWorkDay = isWorkingDay(dateIso, hours);
  const shiftStartMin = parseHm(hours.start);
  const shiftEndMin = parseHm(hours.end);
  const expectedShiftSec = isWorkDay ? Math.max(0, (shiftEndMin - shiftStartMin) * 60) : 0;

  const verdict = judgeAttendance(
    row ?? null,
    hours,
    {
      date: new Date(`${dateIso}T12:00:00Z`),
      onLeave,
      holiday: holidayLabel,
    }
  );

  const checkedInAt = row?.checked_in_at ?? null;
  const checkedOutAt = row?.checked_out_at ?? null;

  let presentSec = verdict.presentSec ?? 0;
  if (!presentSec && checkedInAt) {
    if (checkedOutAt) {
      presentSec = Math.max(
        0,
        Math.round((new Date(checkedOutAt).getTime() - new Date(checkedInAt).getTime()) / 1000)
      );
    }
  }

  const lateMin = verdict.lateBy ?? 0;
  const lateDeficitSec = lateMin * 60;

  // Extra time worked past scheduled shift
  const extraSec = isWorkDay
    ? Math.max(0, presentSec - expectedShiftSec)
    : presentSec; // Work on weekends or days off is 100% extra time!

  // Net balance for the day (extra time minus late deficit)
  const netDailyBalanceSec = extraSec - lateDeficitSec;

  return {
    date: dateIso,
    isWorkDay,
    status: verdict.status,
    checkedInAt,
    checkedOutAt,
    presentSec,
    expectedShiftSec,
    lateMin,
    lateDeficitSec,
    extraSec,
    netDailyBalanceSec,
  };
}

/**
 * Computes the complete monthly overtime summary, late deficit offset, and compensation.
 */
export function computeMonthlyOvertimeSummary(input: {
  periodMonth: string; // e.g. "2026-08"
  attendanceRows: any[];
  hours: WorkHours;
  salaryAmount: number;
  salaryCurrency?: string;
  overtimeMultiplier?: number;
  leaveDays?: Set<string>;
  holidays?: Record<string, string> | Map<string, string>;
}): MonthlyOvertimeSummary {
  const period = String(input.periodMonth).slice(0, 7);
  const [yearStr, monthStr] = period.split("-");
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = (parseInt(monthStr, 10) || (new Date().getMonth() + 1)) - 1;

  const totalDays = daysInMonth(period);
  const workingDaysCount = countWorkingDaysInMonth(year, month, input.hours);

  const shiftStartMin = parseHm(input.hours.start);
  const shiftEndMin = parseHm(input.hours.end);
  const scheduledDailyHours = Math.max(1, (shiftEndMin - shiftStartMin) / 60);

  const rowMap = new Map<string, any>();
  for (const r of input.attendanceRows ?? []) {
    if (r.work_date) {
      rowMap.set(String(r.work_date).slice(0, 10), r);
    }
  }

  const dailyDetails: DailyOvertimeDetail[] = [];
  let totalExtraSec = 0;
  let totalLateDeficitSec = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const row = rowMap.get(dateStr);
    const onLeave = input.leaveDays?.has(dateStr) ?? false;
    const holiday =
      input.holidays instanceof Map
        ? input.holidays.get(dateStr)
        : input.holidays?.[dateStr] ?? null;

    const detail = evaluateDailyOvertime(dateStr, row, input.hours, onLeave, holiday);
    dailyDetails.push(detail);

    totalExtraSec += detail.extraSec;
    totalLateDeficitSec += detail.lateDeficitSec;
  }

  // Offset logic: Extra time automatically offsets previous late deficit first!
  const recoveredDeficitSec = Math.min(totalExtraSec, totalLateDeficitSec);
  const netOvertimeSec = Math.max(0, totalExtraSec - totalLateDeficitSec);
  const unrecoveredDeficitSec = Math.max(0, totalLateDeficitSec - totalExtraSec);

  // Hourly base rate calculation
  const salary = Math.max(0, Number(input.salaryAmount) || 0);
  const totalStandardHoursInMonth = workingDaysCount * scheduledDailyHours;
  const hourlyRate = totalStandardHoursInMonth > 0 ? salary / totalStandardHoursInMonth : 0;

  const multiplier = Number(input.overtimeMultiplier ?? 1.0) || 1.0;
  const netOvertimeHours = netOvertimeSec / 3600;
  const overtimePay = Math.round(netOvertimeHours * hourlyRate * multiplier * 100) / 100;

  return {
    periodMonth: period,
    totalWorkingDays: workingDaysCount,
    scheduledDailyHours,
    totalExtraSec,
    totalLateDeficitSec,
    recoveredDeficitSec,
    netOvertimeSec,
    unrecoveredDeficitSec,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    overtimeMultiplier: multiplier,
    overtimePay,
    currency: String(input.salaryCurrency || "USD").toUpperCase(),
    days: dailyDetails,
  };
}
