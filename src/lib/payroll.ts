/**
 * Working out a part month's pay.
 *
 * Somebody who joins on the 10th of a 31-day month has earned 22/31 of a
 * month, not all of it — and the same applies in reverse when they leave.
 *
 * Real calendar length throughout: February is 28 or 29, and the difference
 * matters to the person being paid. A fixed 30-day month would underpay every
 * January and overpay every February.
 *
 * Pure functions, no database, so the arithmetic can be tested on its own.
 */

/** Days in the month containing `iso` — 28, 29, 30 or 31. */
export function daysInMonth(iso: string): number {
  const d = new Date(`${String(iso).slice(0, 7)}-01T00:00:00`);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Day-of-month as a number, or null if the date is unusable. */
function dayOf(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getDate();
}

/** "2026-08" from anything date-shaped. */
const monthKey = (iso: string) => String(iso).slice(0, 7);

export type ProRata = {
  /** The amount to pay for this month. */
  amount: number;
  daysWorked: number;
  daysInMonth: number;
  /** True when this is anything other than a whole month. */
  isPartial: boolean;
  /** Plain-English explanation, ready to show under the input. */
  reason: string;
};

/**
 * What to pay for one month, given when the person started and finished.
 *
 * Both endpoints are INCLUSIVE. Joining on the 10th means the 10th is a day
 * worked, so the 10th to the 31st is 22 days — not 21. The same for a last
 * working day: leaving on the 12th means the 12th was worked.
 */
export function proRataSalary(input: {
  salary: number;
  /** Any date inside the month being paid for. */
  periodMonth: string;
  joiningDate?: string | null;
  leavingDate?: string | null;
}): ProRata {
  const salary = Math.max(0, Number(input.salary) || 0);
  const period = monthKey(input.periodMonth);
  const total = daysInMonth(input.periodMonth);

  const joinMonth = input.joiningDate ? monthKey(input.joiningDate) : null;
  const leaveMonth = input.leavingDate ? monthKey(input.leavingDate) : null;

  // Whole months outside the engagement earn nothing, and saying so is far
  // more useful than quietly showing zero.
  if (joinMonth && period < joinMonth) {
    return {
      amount: 0,
      daysWorked: 0,
      daysInMonth: total,
      isPartial: true,
      reason: `They had not joined yet — their start date is ${input.joiningDate}.`,
    };
  }
  if (leaveMonth && period > leaveMonth) {
    return {
      amount: 0,
      daysWorked: 0,
      daysInMonth: total,
      isPartial: true,
      reason: `They had already left — their last day was ${input.leavingDate}.`,
    };
  }

  // Both endpoints clamped into this month, so a join and a leave inside the
  // same month intersect correctly rather than each being applied in full.
  const firstDay = joinMonth === period ? (dayOf(input.joiningDate) ?? 1) : 1;
  const lastDay = leaveMonth === period ? (dayOf(input.leavingDate) ?? total) : total;

  const daysWorked = Math.max(0, lastDay - firstDay + 1);
  const isPartial = daysWorked < total;

  // Rounded to the currency's smallest unit, not left as a long fraction.
  const amount = isPartial
    ? Math.round(((salary * daysWorked) / total) * 100) / 100
    : salary;

  if (!isPartial) {
    return { amount, daysWorked, daysInMonth: total, isPartial: false, reason: "A full month." };
  }

  const parts: string[] = [];
  if (joinMonth === period) parts.push(`joined ${input.joiningDate}`);
  if (leaveMonth === period) parts.push(`last day ${input.leavingDate}`);

  return {
    amount,
    daysWorked,
    daysInMonth: total,
    isPartial: true,
    reason:
      `${parts.join(", ")} — ${daysWorked} of ${total} days, ` +
      `so ${amount.toLocaleString()} of the ${salary.toLocaleString()} monthly salary.`,
  };
}
