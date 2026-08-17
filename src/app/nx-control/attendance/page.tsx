import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { PageHead } from "@/components/admin/ui";
import { getWorkHours, getTeamOvertimeSummary } from "@/lib/actions/attendance";
import { holidayMap } from "@/lib/actions/hr";
import { judgeAttendance, humanDuration, isWorkingDay } from "@/lib/workHours";
import { agencyDay, fmtMonth, fmtTime, TZ_LABEL } from "@/lib/datetime";
import { money } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import AttendanceCell from "@/components/admin/AttendanceCell";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

const CELL: Record<string, string> = {
  present: "bg-lime-400/25 text-lime-300",
  late: "bg-amber-400/25 text-amber-300",
  absent: "bg-rose-400/15 text-rose-300",
  on_leave: "bg-ink-600 text-bone-300",
  holiday: "bg-lime-400/15 text-lime-300",
  off: "bg-ink-800 text-bone-600",
};

// The letters live in AttendanceCell now, alongside the click handling. CELL
// stays here only because the legend below still paints swatches from it.

/**
 * Who was in, and when.
 *
 * Owner/admin only — one person's attendance is not another employee's
 * business, and staff see their own on their dashboard.
 *
 * Every verdict is computed at render from the current Settings rule. Widen the
 * grace period and this whole grid re-judges itself; nothing was ever written
 * down that would now be stale.
 */
export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireOwnerAdmin();
  const db = createAdminClient();

  const { month } = await searchParams;
  // "2026-08" → that month. Absent → this one.
  const anchor = month ? new Date(`${month}-01T00:00:00`) : new Date(`${agencyDay().slice(0, 7)}-01T00:00:00`);
  const year = anchor.getFullYear();
  const mon = anchor.getMonth();
  const first = new Date(year, mon, 1);
  const last = new Date(year, mon + 1, 0);
  const days = Array.from({ length: last.getDate() }, (_, i) => new Date(year, mon, i + 1));

  const from = `${year}-${String(mon + 1).padStart(2, "0")}-01`;
  const to = `${year}-${String(mon + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;

  const [{ data: employees }, { data: rows, error }, { data: leaves }, hours, holidays, overtimeList] =
    await Promise.all([
    db
      .from("employees")
      .select("id, full_name, avatar_url, job_title")
      .neq("status", "Terminated")
      .order("full_name"),
    db.from("attendance").select("*").gte("work_date", from).lte("work_date", to),
    db
      .from("leave_requests")
      .select("employee_id, start_date, end_date")
      .eq("status", "approved")
      .lte("start_date", to)
      .gte("end_date", from),
    getWorkHours(),
    holidayMap(from, to),
    getTeamOvertimeSummary(from.slice(0, 7)),
  ]);

  if (error?.code === "42P01") {
    return (
      <>
        <PageHead title="Attendance" sub="Not set up yet." />
        <p className="card p-8 text-center text-sm text-bone-300">
          Run <code className="text-lime-400">supabase/idempotent_fixes_2027_26.sql</code> to
          create the attendance table.
        </p>
      </>
    );
  }

  const byKey = new Map((rows ?? []).map((r: any) => [`${r.employee_id}|${r.work_date}`, r]));

  // Who corrected what, resolved in one query rather than per cell. Only the
  // ids that actually appear — most months this is nobody.
  const editorIds = [...new Set((rows ?? []).map((r: any) => r.edited_by).filter(Boolean))];
  const editorName = new Map<string, string>();
  if (editorIds.length) {
    const { data: editors } = await db
      .from("profiles")
      .select("id, full_name, email")
      .in("id", editorIds as string[]);
    for (const p of editors ?? []) {
      editorName.set(p.id, p.full_name || p.email || "an admin");
    }
  }
  const onLeave = (employeeId: string, iso: string) =>
    (leaves ?? []).some(
      (l: any) => l.employee_id === employeeId && l.start_date <= iso && l.end_date >= iso
    );

  const prev = new Date(year, mon - 1, 1);
  const next = new Date(year, mon + 1, 1);
  const monthParam = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  return (
    <>
      <PageHead
        title="Attendance"
        sub={`${hours.start}–${hours.end} ${TZ_LABEL}, ${hours.graceMin} minutes' grace. Click any day to correct it. Late is recalculated from Settings every time this page loads.`}
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href={`?month=${monthParam(prev)}`} className="mono-tag hover:text-lime-400">
            ← prev
          </a>
          <span className="text-sm text-bone-200">{fmtMonth(first)}</span>
          <a href={`?month=${monthParam(next)}`} className="mono-tag hover:text-lime-400">
            next →
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-bone-400">
          <Key tone="present" label="Present" />
          <Key tone="late" label="Late" />
          <Key tone="absent" label="Absent" />
          <Key tone="on_leave" label="On leave" />
          <Key tone="holiday" label="Holiday" />
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
            Corrected
          </span>
        </div>
      </div>

      {/* Horizontal scroll rather than wrapping — 31 columns cannot fold onto a
          second row and still read as one month. */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-xs">
          <thead>
            <tr className="border-b border-ink-600">
              <th className="sticky left-0 z-10 bg-ink-900 px-4 py-3 text-left font-medium text-bone-300">
                Employee
              </th>
              {days.map((d) => (
                <th
                  key={d.toISOString()}
                  className={`px-1 py-3 text-center font-normal ${
                    isWorkingDay(d, hours) ? "text-bone-400" : "text-bone-600"
                  }`}
                >
                  {d.getDate()}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium text-bone-300">Present</th>
            </tr>
          </thead>
          <tbody>
            {(employees ?? []).map((e: any) => {
              let totalSec = 0;
              let lates = 0;

              const cells = days.map((d) => {
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
                  d.getDate()
                ).padStart(2, "0")}`;
                const row = byKey.get(`${e.id}|${iso}`) ?? null;
                const v = judgeAttendance(row, hours, {
                  date: d,
                  onLeave: onLeave(e.id, iso),
                  holiday: holidays[iso] ?? null,
                });
                totalSec += v.presentSec ?? 0;
                if (v.status === "late") lates++;
                return { iso, v, row };
              });

              return (
                <tr key={e.id} className="border-b border-ink-700/60 hover:bg-ink-800/30">
                  <td className="sticky left-0 z-10 bg-ink-900 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={e.full_name} src={e.avatar_url} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-bone-100">{e.full_name}</p>
                        {lates > 0 && (
                          <p className="mono-tag text-[10px] text-amber-400">{lates} late</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {cells.map(({ iso, v, row }) => (
                    <td key={iso} className="px-0.5 py-2.5 text-center">
                      {/* Clickable. The tooltip still names the holiday rather
                          than just saying "holiday" — the whole point of
                          recording it was the reason. */}
                      <AttendanceCell
                        employeeId={e.id}
                        employeeName={e.full_name}
                        date={iso}
                        verdict={v}
                        row={row}
                        editorName={row?.edited_by ? editorName.get(row.edited_by) ?? null : null}
                      />
                    </td>
                  ))}

                  <td className="px-4 py-2.5 text-right text-bone-200">
                    {humanDuration(totalSec)}
                  </td>
                </tr>
              );
            })}
            {!employees?.length && (
              <tr>
                <td colSpan={days.length + 2} className="px-5 py-8 text-center text-bone-400">
                  No employees yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Monthly Overtime & Deficit Offset Summary */}
      <section className="mt-8 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-bone-50">
            Monthly Overtime & Late-Deficit Balance
          </h2>
          <p className="text-xs text-bone-300">
            Extra time worked automatically offsets previous late attendance before qualifying as payable overtime.
          </p>
        </div>

        <div className="card overflow-x-auto border-ink-600">
          <table className="w-full min-w-max text-left text-xs">
            <thead className="border-b border-ink-700 bg-ink-800/80 text-bone-400">
              <tr>
                <th className="p-3 font-medium">Employee</th>
                <th className="p-3 font-medium">Total Extra Worked</th>
                <th className="p-3 font-medium">Late Deficit Recovered</th>
                <th className="p-3 font-medium">Net Payable Overtime</th>
                <th className="p-3 font-medium">Unrecovered Deficit</th>
                <th className="p-3 font-medium">Overtime Compensation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/60 font-mono">
              {(overtimeList ?? []).map(({ employee, summary }: any) => (
                <tr key={employee.id} className="hover:bg-ink-800/30 transition-colors">
                  <td className="p-3 font-sans">
                    <p className="font-semibold text-bone-100">{employee.full_name}</p>
                    <p className="mono-tag text-[10px] text-bone-400">{employee.job_title}</p>
                  </td>
                  <td className="p-3 text-blue-300">
                    {summary.totalExtraSec > 0 ? `+${humanDuration(summary.totalExtraSec)}` : "0m"}
                  </td>
                  <td className="p-3 text-emerald-300">
                    {summary.recoveredDeficitSec > 0 ? `-${humanDuration(summary.recoveredDeficitSec)}` : "0m"}
                  </td>
                  <td className="p-3 text-lime-400 font-bold">
                    {summary.netOvertimeSec > 0 ? humanDuration(summary.netOvertimeSec) : "0m"}
                  </td>
                  <td className="p-3 text-amber-300">
                    {summary.unrecoveredDeficitSec > 0 ? humanDuration(summary.unrecoveredDeficitSec) : "0m"}
                  </td>
                  <td className="p-3 font-sans">
                    {summary.overtimePay > 0 ? (
                      <span className="mono-tag text-[11px] px-2 py-0.5 rounded bg-lime-400/15 text-lime-300 font-bold border border-lime-400/30">
                        {money(summary.overtimePay, summary.currency)}
                      </span>
                    ) : (
                      <span className="text-bone-500 font-mono">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!overtimeList?.length && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-bone-400 font-sans">
                    No active employees.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Key({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded ${CELL[tone]}`} />
      {label}
    </span>
  );
}
