"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import Avatar from "@/components/Avatar";
import { recordSalaryPayment } from "@/lib/actions/payroll";
import { money } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-2 py-1.5 text-sm focus:border-lime-400 focus:outline-none";

/**
 * Paying the team for one month, in one pass.
 *
 * Anyone already paid for the period is shown as done and cannot be selected —
 * the guard against paying somebody twice is that they are not in the list of
 * things you can tick, not a warning after the fact.
 *
 * Runs sequentially and reports per person. A partial failure has to be
 * visible: "9 of 11 paid" is actionable, a single "something went wrong" is not.
 */
export default function PayrollRunClient({
  rows,
  periodMonth,
}: {
  rows: any[];
  periodMonth: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const payable = rows.filter((r) => !r.alreadyPaid && Number(r.suggested) > 0);

  const [picked, setPicked] = useState<Set<string>>(new Set(payable.map((r) => r.id)));
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(payable.map((r) => [r.id, String(r.suggested)]))
  );
  const [notify, setNotify] = useState(true);
  const [progress, setProgress] = useState<string | null>(null);

  const toggle = (id: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const total = [...picked].reduce((s, id) => s + (Number(amounts[id]) || 0), 0);
  // Grouped by currency: summing PKR and USD into one figure would be a number
  // that means nothing.
  const totals = [...picked].reduce<Record<string, number>>((acc, id) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return acc;
    const cur = row.currency || "USD";
    acc[cur] = (acc[cur] ?? 0) + (Number(amounts[id]) || 0);
    return acc;
  }, {});

  const run = () =>
    start(async () => {
      const chosen = [...picked];
      let done = 0;
      const failed: string[] = [];

      // Sequential, not parallel: each one sends an email and writes a row, and
      // a burst of eleven would be exactly the SMTP pattern that earned a 451.
      for (const id of chosen) {
        const row = rows.find((r) => r.id === id);
        if (!row) continue;
        setProgress(`${done + 1} of ${chosen.length} — ${row.full_name}`);

        const res = await recordSalaryPayment({
          employeeId: id,
          periodMonth,
          amount: Number(amounts[id]) || 0,
          currency: row.currency || "USD",
          notifyEmployee: notify,
        });

        if (res.ok) done++;
        else failed.push(`${row.full_name}: ${res.error}`);
      }

      setProgress(null);

      if (!failed.length) {
        toast.success(`${done} paid.`);
      } else {
        toast.error(`${done} paid, ${failed.length} failed.`);
        // Logged in full — a toast truncates, and the person running payroll
        // needs to know exactly who did not go through.
        console.error("Payroll run failures:\n" + failed.join("\n"));
      }
      router.refresh();
    });

  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-ink-600 text-left">
              <th className="px-4 py-3 font-medium text-bone-300">Pay</th>
              <th className="px-4 py-3 font-medium text-bone-300">Employee</th>
              <th className="px-4 py-3 font-medium text-bone-300">Monthly salary</th>
              <th className="px-4 py-3 font-medium text-bone-300">This run</th>
              <th className="px-4 py-3 font-medium text-bone-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-ink-700/60">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    disabled={r.alreadyPaid || pending}
                    checked={picked.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="accent-lime-400 disabled:opacity-40"
                    aria-label={`Pay ${r.full_name}`}
                  />
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.full_name} src={r.avatar_url} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-bone-100">{r.full_name}</p>
                      <p className="mono-tag text-[10px]">
                        {r.job_title}
                        {r.departmentName ? ` · ${r.departmentName}` : ""}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 text-bone-300">
                  {Number(r.salary_amount) > 0
                    ? money(Number(r.salary_amount), r.currency)
                    : "—"}
                </td>

                <td className="px-4 py-3">
                  {r.alreadyPaid ? (
                    <span className="text-bone-500">—</span>
                  ) : (
                    <input
                      className={`${field} w-32`}
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!picked.has(r.id) || pending}
                      value={amounts[r.id] ?? ""}
                      onChange={(e) => setAmounts({ ...amounts, [r.id]: e.target.value })}
                    />
                  )}
                  {r.proRataReason && (
                    <p className="mt-1 text-[11px] text-amber-300">{r.proRataReason}</p>
                  )}
                </td>

                <td className="px-4 py-3">
                  {r.alreadyPaid ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-lime-400">
                      <CheckCircle2 size={12} /> Paid {money(Number(r.paidAmount), r.currency)}
                    </span>
                  ) : Number(r.suggested) <= 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-400">
                      <AlertTriangle size={12} /> No salary set
                    </span>
                  ) : (
                    <span className="mono-tag text-[10px]">Ready</span>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-bone-400">
                  No active employees.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-bone-300">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="accent-lime-400"
          />
          Email each person as they are paid
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <div className="text-right">
            <p className="mono-tag text-[10px]">
              {picked.size} selected
            </p>
            <p className="font-mono text-lg text-lime-400">
              {Object.entries(totals)
                .map(([cur, amt]) => money(amt, cur))
                .join(" · ") || "—"}
            </p>
          </div>

          <button
            className="btn btn-primary gap-2"
            disabled={pending || !picked.size || total <= 0}
            onClick={run}
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : null}
            {pending ? progress ?? "Paying…" : `Pay ${picked.size}`}
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-bone-400">
        Each payment is recorded one at a time and appears immediately on that person&apos;s My
        Pay page. Anyone already paid for this month cannot be selected, so running this twice
        does nothing the second time.
      </p>
    </>
  );
}
