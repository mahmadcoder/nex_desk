"use client";

import { useState } from "react";
import { type MonthlyOvertimeSummary } from "@/lib/overtime";
import { humanDuration, fmtTime, fmtDate } from "@/lib/datetime";
import { money } from "@/lib/utils";
import { Clock, PlusCircle, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, DollarSign } from "lucide-react";

export default function OvertimeWidget({
  summary,
}: {
  summary: MonthlyOvertimeSummary | null;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!summary) return null;

  const totalExtraFormatted = summary.totalExtraSec > 0 ? humanDuration(summary.totalExtraSec) : "0m";
  const recoveredFormatted = summary.recoveredDeficitSec > 0 ? humanDuration(summary.recoveredDeficitSec) : "0m";
  const netOvertimeFormatted = summary.netOvertimeSec > 0 ? humanDuration(summary.netOvertimeSec) : "0m";
  const unrecoveredLateFormatted = summary.unrecoveredDeficitSec > 0 ? humanDuration(summary.unrecoveredDeficitSec) : "0m";

  return (
    <div className="card p-5 border-ink-600 bg-gradient-to-br from-ink-900 via-ink-900/90 to-ink-800/60 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700/60 pb-3">
        <div>
          <span className="mono-tag text-[10px] text-lime-400 font-semibold uppercase tracking-wider">
            Time & Deficit Balance
          </span>
          <h2 className="text-base font-semibold text-bone-50 mt-0.5">
            Extra Time & Overtime Compensation
          </h2>
          <p className="text-xs text-bone-300 mt-0.5">
            Extra hours worked automatically offset previous late arrival deficits before calculating paid overtime.
          </p>
        </div>

        {summary.overtimePay > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-lime-400/30 bg-lime-400/10 px-3 py-1.5 text-lime-300 font-semibold text-xs">
            <DollarSign size={14} />
            Overtime Pay: {money(summary.overtimePay, summary.currency)}
          </div>
        )}
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-ink-700 bg-ink-800/50 p-3.5 space-y-1">
          <span className="mono-tag text-[10px] text-blue-300 flex items-center gap-1">
            <PlusCircle size={11} /> Total Extra Worked
          </span>
          <p className="font-mono text-base font-bold text-bone-50">+{totalExtraFormatted}</p>
          <p className="text-[10px] text-bone-400">Hours past scheduled shift</p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1">
          <span className="mono-tag text-[10px] text-emerald-300 flex items-center gap-1">
            <CheckCircle2 size={11} /> Deficit Recovered
          </span>
          <p className="font-mono text-base font-bold text-emerald-300">-{recoveredFormatted}</p>
          <p className="text-[10px] text-emerald-400/80">Late arrivals neutralized</p>
        </div>

        <div className="rounded-xl border border-lime-400/30 bg-lime-400/5 p-3.5 space-y-1">
          <span className="mono-tag text-[10px] text-lime-400 flex items-center gap-1">
            <Clock size={11} /> Net Payable Overtime
          </span>
          <p className="font-mono text-base font-bold text-lime-300">{netOvertimeFormatted}</p>
          <p className="text-[10px] text-bone-400">Approved for payroll bonus</p>
        </div>

        <div className="rounded-xl border border-ink-700 bg-ink-800/50 p-3.5 space-y-1">
          <span className="mono-tag text-[10px] text-bone-400 flex items-center gap-1">
            <DollarSign size={11} /> Hourly Rate
          </span>
          <p className="font-mono text-base font-bold text-bone-100">
            {money(summary.hourlyRate, summary.currency)}/hr
          </p>
          <p className="text-[10px] text-bone-400">Rate: {summary.overtimeMultiplier}x standard</p>
        </div>
      </div>

      {summary.unrecoveredDeficitSec > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-300">
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            Remaining unrecovered late deficit this month: <strong>{unrecoveredLateFormatted}</strong>. Working extra hours on upcoming days will automatically recover this deficit.
          </span>
        </div>
      )}

      {/* Expand / Collapse Daily Breakdown Table */}
      <div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mono-tag inline-flex items-center gap-1.5 text-xs text-bone-300 hover:text-lime-400 transition-colors cursor-pointer"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? "Hide Daily Breakdown Table" : "View Day-by-Day Extra Time & Deficit Breakdown"}
        </button>

        {expanded && (
          <div className="mt-3 overflow-x-auto rounded-lg border border-ink-700">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink-700 bg-ink-800/80 text-bone-400">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Clock In / Out</th>
                  <th className="p-2.5">Time Present</th>
                  <th className="p-2.5">Late Deficit</th>
                  <th className="p-2.5">Extra Worked</th>
                  <th className="p-2.5">Net Daily</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700/60 font-mono">
                {summary.days
                  .filter((d) => d.presentSec > 0 || d.lateMin > 0 || d.extraSec > 0)
                  .map((d) => (
                    <tr key={d.date} className="hover:bg-ink-800/40 transition-colors">
                      <td className="p-2.5 text-bone-200">{fmtDate(d.date)}</td>
                      <td className="p-2.5">
                        <span
                          className={`mono-tag text-[10px] px-1.5 py-0.5 rounded capitalize ${
                            d.status === "present"
                              ? "text-lime-300 bg-lime-400/10"
                              : d.status === "late"
                                ? "text-amber-300 bg-amber-400/10"
                                : "text-bone-400 bg-ink-800"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-bone-400">
                        {d.checkedInAt ? fmtTime(d.checkedInAt) : "—"}
                        {d.checkedOutAt ? ` → ${fmtTime(d.checkedOutAt)}` : ""}
                      </td>
                      <td className="p-2.5 text-bone-300">
                        {d.presentSec > 0 ? humanDuration(d.presentSec) : "—"}
                      </td>
                      <td className="p-2.5 text-amber-300">
                        {d.lateMin > 0 ? `-${d.lateMin}m` : "—"}
                      </td>
                      <td className="p-2.5 text-blue-300">
                        {d.extraSec > 0 ? `+${humanDuration(d.extraSec)}` : "—"}
                      </td>
                      <td className="p-2.5 font-bold">
                        {d.netDailyBalanceSec > 0 ? (
                          <span className="text-lime-400">+{humanDuration(d.netDailyBalanceSec)}</span>
                        ) : d.netDailyBalanceSec < 0 ? (
                          <span className="text-rose-400">-{humanDuration(Math.abs(d.netDailyBalanceSec))}</span>
                        ) : (
                          <span className="text-bone-500">0m</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
