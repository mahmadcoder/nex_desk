"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wallet, Plus, Trash2, FileText, AlertTriangle } from "lucide-react";
import Modal from "@/components/admin/Modal";
import ConfirmModal from "@/components/admin/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";
import ReceiptUpload from "@/components/admin/ReceiptUpload";
import { money, CURRENCIES } from "@/lib/utils";
import { recordSalaryPayment, deleteSalaryPayment } from "@/lib/actions/payroll";
import { proRataSalary } from "@/lib/payroll";
import { fmtMonth } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none";

const METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "wise", label: "Wise" },
  { value: "payoneer", label: "Payoneer" },
  { value: "other", label: "Other" },
];

const firstOfThisMonth = () => new Date().toISOString().slice(0, 8) + "01";
const monthLabel = (iso: string) => fmtMonth(String(iso).slice(0, 10));

/**
 * Recording that someone was actually paid.
 *
 * Sits beside `CompensationCard`, which records the DECISION to pay — a raise
 * or a bonus. This is the transfer itself, and it is what the employee sees on
 * their own My Pay page.
 */
export default function SalaryPaymentsCard({
  employee,
  payments,
}: {
  employee: any;
  payments: any[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const [f, setF] = useState(() => {
    // Pro-rated from the first render, not only after the month is changed —
    // opening the form in somebody's joining month and seeing a full salary
    // pre-filled is exactly how the wrong amount gets sent.
    const opening = firstOfThisMonth();
    return {
    periodMonth: opening,
    amount: String(
      proRataSalary({
        salary: Number(employee.salary_amount || 0),
        periodMonth: opening,
        joiningDate: employee.joining_date,
        leavingDate: employee.leaving_date,
      }).amount || ""
    ),
    currency: String(employee.salary_currency || "USD").toUpperCase(),
    paidOn: new Date().toISOString().slice(0, 10),
    method: "bank_transfer",
    reference: "",
    slipUrl: "",
    note: "",
    notifyEmployee: true,
    };
  });

  // What this month is actually worth for this person. Somebody who joined on
  // the 10th of a 31-day month has earned 22/31 of a month, not all of it.
  const proRata = useMemo(
    () =>
      proRataSalary({
        salary: Number(employee.salary_amount || 0),
        periodMonth: f.periodMonth,
        joiningDate: employee.joining_date,
        leavingDate: employee.leaving_date,
      }),
    [employee.salary_amount, employee.joining_date, employee.leaving_date, f.periodMonth]
  );

  // Paying a month in two instalments is normal, so this is a warning rather
  // than a block — but paying the same month twice by accident is not, and
  // that is worth catching before it reaches someone's bank.
  const alreadyPaid = useMemo(
    () => payments.filter((p) => String(p.period_month).slice(0, 7) === f.periodMonth.slice(0, 7)),
    [payments, f.periodMonth]
  );
  const alreadyPaidTotal = alreadyPaid.reduce((s, p) => s + Number(p.amount || 0), 0);

  const thisYear = payments.filter(
    (p) => new Date(p.paid_on).getFullYear() === new Date().getFullYear()
  );

  function submit() {
    if (!Number(f.amount)) {
      toast.error("Enter the amount you actually transferred.");
      return;
    }
    start(async () => {
      const res = await recordSalaryPayment({
        employeeId: employee.id,
        periodMonth: f.periodMonth,
        amount: Number(f.amount),
        currency: f.currency,
        paidOn: f.paidOn,
        method: f.method,
        reference: f.reference,
        slipUrl: f.slipUrl,
        note: f.note,
        notifyEmployee: f.notifyEmployee,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.emailed
          ? `Recorded. ${employee.full_name.split(" ")[0]} has been told.`
          : "Recorded."
      );
      setOpen(false);
      setF({ ...f, reference: "", slipUrl: "", note: "" });
      router.refresh();
    });
  }

  function remove(p: any) {
    start(async () => {
      const res = await deleteSalaryPayment(p.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Removed.");
      setConfirmDelete(null);
      router.refresh();
    });
  }

  return (
    <section className="card space-y-3 border-ink-600 p-5">
      <div className="flex items-center justify-between gap-3 border-b border-ink-700 pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-bone-50">
          <Wallet size={16} className="text-lime-400" /> Salary paid
        </h2>
        <button type="button" onClick={() => setOpen(true)} className="btn btn-sm gap-1.5">
          <Plus size={13} /> Record
        </button>
      </div>

      {!payments.length ? (
        <p className="text-xs leading-relaxed text-bone-300">
          Nothing recorded yet. Log each transfer with its slip — {employee.full_name.split(" ")[0]}{" "}
          is emailed and sees it on their own My Pay page.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-ink-700">
            {payments.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-bone-100">
                    {money(Number(p.amount), p.currency)}
                    <span className="ml-2 text-[11px] text-bone-400">
                      for {monthLabel(p.period_month)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-bone-400">
                    Sent {p.paid_on}
                    {p.reference ? ` · ${p.reference}` : ""}
                    {p.method ? ` · ${String(p.method).replace(/_/g, " ")}` : ""}
                  </p>
                  {p.note && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-bone-300">{p.note}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {p.slip_url && (
                    <a
                      href={p.slip_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open the slip"
                      className="text-bone-400 hover:text-lime-400"
                    >
                      <FileText size={13} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(p)}
                    title="Remove"
                    className="text-bone-400 hover:text-rose-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {!!thisYear.length && (
            <p className="border-t border-ink-700 pt-3 text-[11px] text-bone-400">
              {thisYear.length} payment{thisYear.length === 1 ? "" : "s"} this year.
            </p>
          )}
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        size="lg"
        eyebrow={employee.full_name}
        title="Record a salary payment"
        description="The transfer itself — separate from any raise or bonus decision."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={pending}>
              {pending ? "Recording…" : "Record payment"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mono-tag mb-1.5 block text-xs">Which month is this for *</label>
              <input
                className={field}
                type="month"
                value={f.periodMonth.slice(0, 7)}
                onChange={(e) => {
                  const periodMonth = `${e.target.value}-01`;
                  const next = proRataSalary({
                    salary: Number(employee.salary_amount || 0),
                    periodMonth,
                    joiningDate: employee.joining_date,
                    leavingDate: employee.leaving_date,
                  });
                  // Re-suggest the figure for the month just chosen. Still
                  // editable — a part month is a starting point, not a rule.
                  setF({ ...f, periodMonth, amount: String(next.amount) });
                }}
              />
              <p className="mt-1 text-[11px] text-bone-400">
                The month the work was done, not the day you sent it.
              </p>
            </div>
            <div>
              <label className="mono-tag mb-1.5 block text-xs">Sent on</label>
              <input
                className={field}
                type="date"
                value={f.paidOn}
                onChange={(e) => setF({ ...f, paidOn: e.target.value })}
              />
            </div>
          </div>

          {!!alreadyPaid.length && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] p-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-xs leading-relaxed text-amber-200">
                {money(alreadyPaidTotal, alreadyPaid[0].currency)} has already been recorded for{" "}
                {monthLabel(f.periodMonth)}. If this is a second instalment that is fine — if not,
                check before you record it.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mono-tag mb-1.5 block text-xs">Amount transferred *</label>
              <input
                className={field}
                type="number"
                min="0"
                step="0.01"
                value={f.amount}
                onChange={(e) => setF({ ...f, amount: e.target.value })}
              />
              <p className={`mt-1 text-[11px] leading-relaxed ${proRata.isPartial ? "text-amber-300" : "text-bone-400"}`}>
                {proRata.isPartial
                  ? proRata.reason
                  : `Their full monthly salary is ${money(Number(employee.salary_amount || 0), employee.salary_currency)}.`}
              </p>
            </div>
            <div>
              <CustomSelect
                label="Currency"
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                value={f.currency}
                onChange={(v) => setF({ ...f, currency: v })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <CustomSelect
                label="How you sent it"
                options={METHODS}
                value={f.method}
                onChange={(v) => setF({ ...f, method: v })}
              />
            </div>
            <div>
              <label className="mono-tag mb-1.5 block text-xs">Reference (optional)</label>
              <input
                className={field}
                value={f.reference}
                onChange={(e) => setF({ ...f, reference: e.target.value })}
                placeholder="Transaction ID"
              />
            </div>
          </div>

          <ReceiptUpload
            initialUrl={f.slipUrl}
            onUploaded={(url) => setF({ ...f, slipUrl: url })}
          />

          <div>
            <label className="mono-tag mb-1.5 block text-xs">Note (optional)</label>
            <textarea
              className={`${field} min-h-[60px] resize-y`}
              value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
              placeholder="Anything they should know — a deduction, an advance, a part payment."
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-ink-600 bg-ink-800/50 p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 accent-lime-400"
              checked={f.notifyEmployee}
              onChange={(e) => setF({ ...f, notifyEmployee: e.target.checked })}
              disabled={!employee.email}
            />
            <span className="text-xs leading-relaxed text-bone-200">
              Tell {employee.full_name.split(" ")[0]}
              <span className="block text-[11px] text-bone-400">
                {employee.email
                  ? "An email with the slip, and a notification in their panel. Turn this off when back-filling old payments."
                  : "No email address on file for this employee."}
              </span>
            </span>
          </label>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        pending={pending}
        isDanger
        title="Remove this payment record?"
        confirmText="Remove"
        description={
          confirmDelete
            ? `${money(Number(confirmDelete.amount), confirmDelete.currency)} for ${monthLabel(confirmDelete.period_month)} disappears from their My Pay page and from Money In & Out. The employee is not told. This cannot be undone.`
            : ""
        }
        onConfirm={() => confirmDelete && remove(confirmDelete)}
      />
    </section>
  );
}
