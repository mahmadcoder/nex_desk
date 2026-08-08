import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Stat, Empty } from "@/components/admin/ui";
import AttendanceWidget from "@/components/admin/AttendanceWidget";
import { getWorkHours, myAttendanceToday } from "@/lib/actions/attendance";
import { holidayMap } from "@/lib/actions/hr";
import { judgeAttendance, humanDuration, isWorkingDay } from "@/lib/workHours";
import { agencyDay, fmtMonth, fmtDate, fmtTime, TZ_LABEL } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "My Attendance" };
export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  present: "bg-lime-400/15 text-lime-300 border-lime-400/30",
  late: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  absent: "bg-rose-400/10 text-rose-300 border-rose-400/25",
  on_leave: "bg-ink-700 text-bone-300 border-ink-600",
  holiday: "bg-lime-400/10 text-lime-300 border-lime-400/20",
  off: "bg-ink-800 text-bone-500 border-ink-700",
};

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * Your own attendance.
 *
 * The month grid at `/attendance` is owner/admin only — one person's lateness
 * is nobody else's business — so a staff member could see whether they had
 * clocked in *today* and nothing more. Not last Tuesday, not how many times
 * they had been late, not how many hours the month came to.
 *
 * That matters more here than it would elsewhere, because pay is worked out
 * from hours. Somebody being paid on a number they cannot see is being asked
 * to take it on trust.
 *
 * Scoped to the signed-in employee and never accepts an id. Admins see this
 * too — they now clock in like everyone else.
 */
export default async function MyAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const me = await getCurrentStaff();
  if (!me) return null;

  if (!me.employeeId) {
    return (
      <>
        <PageHead title="My Attendance" />
        <Empty
          title="No employee record linked to this login"
          body="Attendance is recorded against an employee profile. If you should have one, ask an owner or admin to link your account."
        />
      </>
    );
  }

  const db = createAdminClient();
  const { month } = await searchParams;

  const anchor = month
    ? new Date(`${month}-01T00:00:00`)
    : new Date(`${agencyDay().slice(0, 7)}-01T00:00:00`);
  const year = anchor.getFullYear();
  const mon = anchor.getMonth();
  const last = new Date(year, mon + 1, 0);

  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${year}-${pad(mon + 1)}-01`;
  const to = `${year}-${pad(mon + 1)}-${pad(last.getDate())}`;
  const today = agencyDay();

  const [{ data: rows, error }, { data: leaves }, hours, holidays, todayState] = await Promise.all([
    db
      .from("attendance")
      .select("*")
      .eq("employee_id", me.employeeId)
      .gte("work_date", from)
      .lte("work_date", to),
    db
      .from("leave_requests")
      .select("start_date, end_date")
      .eq("employee_id", me.employeeId)
      .eq("status", "approved")
      .lte("start_date", to)
      .gte("end_date", from),
    getWorkHours(),
    holidayMap(from, to),
    myAttendanceToday(),
  ]);

  if (error?.code === "42P01") {
    return (
      <>
        <PageHead title="My Attendance" sub="Not set up yet." />
        <p className="card p-8 text-center text-sm text-bone-300">
          Attendance is not switched on yet. Ask an owner to run{" "}
          <code className="text-lime-400">supabase/idempotent_fixes_2027_26.sql</code>.
        </p>
      </>
    );
  }

  const byDate = new Map((rows ?? []).map((r: any) => [r.work_date, r]));
  const onLeave = (iso: string) =>
    (leaves ?? []).some((l: any) => l.start_date <= iso && l.end_date >= iso);

  // Future days of the current month are not "absent" — they have not happened.
  const days = Array.from({ length: last.getDate() }, (_, i) => new Date(year, mon, i + 1))
    .map((d) => {
      const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const row = byDate.get(iso) ?? null;
      return {
        iso,
        date: d,
        row,
        future: iso > today,
        verdict: judgeAttendance(row, hours, {
          date: d,
          onLeave: onLeave(iso),
          holiday: holidays[iso] ?? null,
        }),
      };
    })
    .filter((d) => !d.future || d.row)
    .reverse();

  const counted = days.filter((d) => !d.future);
  const presentDays = counted.filter((d) => ["present", "late"].includes(d.verdict.status)).length;
  const lateDays = counted.filter((d) => d.verdict.status === "late").length;
  const absentDays = counted.filter((d) => d.verdict.status === "absent").length;
  const totalSec = counted.reduce((s, d) => s + (d.verdict.presentSec ?? 0), 0);

  const prev = new Date(year, mon - 1, 1);
  const next = new Date(year, mon + 1, 1);
  const param = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const isThisMonth = from.slice(0, 7) === today.slice(0, 7);

  return (
    <>
      <PageHead
        title="My Attendance"
        sub={`Your own record. Working hours are ${hours.start}–${hours.end} ${TZ_LABEL}, with ${hours.graceMin} minutes' grace.`}
      />

      {/* Today's clock first — it is the only thing here you can still act on. */}
      {isThisMonth && todayState && (
        <div className="mb-6 max-w-md">
          <AttendanceWidget
            row={todayState.row}
            verdict={todayState.verdict}
            hours={todayState.hours}
          />
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`?month=${param(prev)}`} className="mono-tag hover:text-lime-400">
            ← prev
          </Link>
          <span className="text-sm text-bone-200">{fmtMonth(anchor)}</span>
          <Link href={`?month=${param(next)}`} className="mono-tag hover:text-lime-400">
            next →
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Days present" value={String(presentDays)} tone="good" />
        <Stat
          label="Late arrivals"
          value={String(lateDays)}
          tone={lateDays ? "warn" : "default"}
          hint={`${hours.graceMin}m grace`}
        />
        <Stat
          label="Absent"
          value={String(absentDays)}
          tone={absentDays ? "warn" : "default"}
          hint="working days only"
        />
        <Stat label="Hours recorded" value={humanDuration(totalSec)} hint="clocked in to out" />
      </div>

      {!counted.length ? (
        <Empty title="Nothing recorded this month" body="Check in from the dashboard and it will appear here." />
      ) : (
        <ul className="card divide-y divide-ink-700">
          {days.map(({ iso, date, row, verdict, future }) => (
            <li key={iso} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm text-bone-100">
                  {fmtDate(iso)}
                  {iso === today && <span className="mono-tag ml-2 text-[10px] text-lime-400">today</span>}
                </p>
                <p className="mono-tag mt-1 text-[10px]">
                  {new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date)}
                  {row?.checked_in_at && ` · in ${fmtTime(row.checked_in_at)}`}
                  {row?.checked_out_at && ` · out ${fmtTime(row.checked_out_at)}`}
                  {!isWorkingDay(date, hours) && !row ? " · rest day" : ""}
                </p>

                {/* Said out loud rather than hidden behind a dot. If somebody
                    else changed your record you should not have to notice a
                    marker to find out. */}
                {verdict.edited && (
                  <p className="mt-1 text-[11px] text-sky-300">
                    Corrected by an admin{row?.edit_reason ? ` — ${row.edit_reason}` : ""}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {verdict.presentSec ? (
                  <span className="text-xs text-bone-300">{humanDuration(verdict.presentSec)}</span>
                ) : null}
                <span
                  className={`mono-tag rounded-full border px-2.5 py-1 text-[10px] capitalize ${
                    future ? TONE.off : TONE[verdict.status]
                  }`}
                >
                  {verdict.label ?? verdict.status.replace("_", " ")}
                  {verdict.lateBy ? ` ${verdict.lateBy}m` : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs leading-relaxed text-bone-400">
        Something wrong here? Tell an owner or admin — they can correct a day, and the correction
        is recorded with their name and a reason.{" "}
        {me.isPrivileged && (
          <Link href={`/${ADMIN}/attendance`} className="text-lime-400 hover:underline">
            Everyone&rsquo;s attendance
          </Link>
        )}
      </p>
    </>
  );
}
