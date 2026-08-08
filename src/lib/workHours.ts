import { AGENCY_TZ } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * When the working day starts, and whether somebody made it.
 *
 * "Late" is worked out here every time it is displayed, and is never written to
 * a row. Storing it would freeze yesterday's answer against today's rule: widen
 * the grace period from 15 minutes to 45 and every past record would still
 * carry the old verdict, with no way to tell which rule produced it.
 *
 * Everything is evaluated in the agency's timezone. A check-in stored as UTC
 * `03:31Z` is 08:31 in Karachi, and comparing the UTC hour against a 09:00
 * start would call an early arrival late.
 */

export type WorkHours = {
  /** "09:00" */
  start: string;
  /** "18:00" */
  end: string;
  graceMin: number;
  /** ISO weekdays, 1 = Monday … 7 = Sunday. */
  days: number[];
};

export const DEFAULT_WORK_HOURS: WorkHours = {
  start: "09:00",
  end: "18:00",
  graceMin: 15,
  days: [1, 2, 3, 4, 5],
};

/** Reads the settings row's columns into a shape, tolerating a pre-2027-26 DB. */
export function workHoursFrom(settings: any): WorkHours {
  if (!settings) return DEFAULT_WORK_HOURS;
  return {
    start: String(settings.work_start ?? DEFAULT_WORK_HOURS.start).slice(0, 5),
    end: String(settings.work_end ?? DEFAULT_WORK_HOURS.end).slice(0, 5),
    graceMin: Number(settings.work_grace_min ?? DEFAULT_WORK_HOURS.graceMin),
    days: Array.isArray(settings.work_days) && settings.work_days.length
      ? settings.work_days.map(Number)
      : DEFAULT_WORK_HOURS.days,
  };
}

/** Minutes past midnight, in the agency timezone. */
export function minutesOfDay(at: string | Date, tz = AGENCY_TZ): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(at));

  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  // Intl renders midnight as "24" in some locales/engines.
  return (h % 24) * 60 + m;
}

/** "09:00" → 540. */
export function parseHm(hm: string): number {
  const [h, m] = String(hm).split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** ISO weekday (1 = Mon … 7 = Sun) of a date, in the agency timezone. */
export function isoWeekday(date: string | Date, tz = AGENCY_TZ): number {
  const name = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short" }).format(
    new Date(date)
  );
  const idx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(name.slice(0, 3));
  return idx >= 0 ? idx + 1 : 1;
}

export function isWorkingDay(date: string | Date, hours: WorkHours): boolean {
  return hours.days.includes(isoWeekday(date));
}

export type AttendanceVerdict = {
  status: "on_leave" | "holiday" | "present" | "late" | "absent" | "off";
  /** Minutes past the grace deadline. 0 unless `late`. */
  lateBy: number;
  /** Seconds between check-in and check-out, when both exist. */
  presentSec: number | null;
  /** The holiday's name, when `status` is `holiday`. */
  label?: string | null;
};

/**
 * What to say about one person on one day.
 *
 * Order matters. Leave is checked first, because somebody on approved leave who
 * is marked "absent" — or worse, "late" — will not trust anything else the
 * system tells them.
 */
export function judgeAttendance(
  row: { checked_in_at?: string | null; checked_out_at?: string | null } | null,
  hours: WorkHours,
  opts: {
    date: string | Date;
    onLeave?: boolean;
    /** The holiday's name, when this date is one. */
    holiday?: string | null;
  }
): AttendanceVerdict {
  const none = { lateBy: 0, presentSec: null };

  if (opts.onLeave) return { status: "on_leave", ...none };

  // Before the working-day check and before anything about lateness. Calling a
  // public holiday "absent" — or worse, marking somebody late on Eid — is the
  // kind of error that makes people stop believing the rest of the numbers.
  if (opts.holiday) return { status: "holiday", label: opts.holiday, ...none };

  if (!isWorkingDay(opts.date, hours)) return { status: "off", ...none };
  if (!row?.checked_in_at) return { status: "absent", ...none };

  const presentSec = row.checked_out_at
    ? Math.max(0, Math.round((+new Date(row.checked_out_at) - +new Date(row.checked_in_at)) / 1000))
    : null;

  const deadline = parseHm(hours.start) + hours.graceMin;
  const arrived = minutesOfDay(row.checked_in_at);

  return arrived > deadline
    ? { status: "late", lateBy: arrived - deadline, presentSec }
    : { status: "present", lateBy: 0, presentSec };
}

/** "6h 40m" — used everywhere hours are shown, so they read the same way. */
export function humanDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Decimal hours for the daily log's numeric field. 15000s → 4.17 */
export function decimalHours(seconds?: number | null): number {
  if (!seconds || seconds <= 0) return 0;
  return Math.round((seconds / 3600) * 100) / 100;
}
