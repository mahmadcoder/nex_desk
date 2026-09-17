"use client";

import { useState } from "react";
import { fmtDate } from "@/lib/datetime";
import { money, moneyMulti } from "@/lib/utils";
import { useScrollLock } from "@/lib/useScrollLock";
import { FileText, Printer, X, CheckCircle2, AlertCircle } from "lucide-react";

interface StatementOfAccountModalProps {
  clientName: string;
  companyName?: string | null;
  billing: {
    contractValue: any[];
    totalPaid: any[];
    balanceOwed: any[];
    totalOwed: any[];
    invoices: any[];
  };
  agencyName?: string;
}

export default function StatementOfAccountModal({
  clientName,
  companyName,
  billing,
  agencyName = "NexDesk Agency",
}: StatementOfAccountModalProps) {
  const [open, setOpen] = useState(false);
  useScrollLock(open);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mono-tag inline-flex items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800/80 px-3.5 py-2 text-xs text-bone-300 transition-colors hover:border-lime-400/50 hover:text-lime-300 cursor-pointer shadow-sm"
        title="View and print consolidated statement of account"
      >
        <FileText size={14} className="text-lime-400" />
        <span>Statement of Account</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:p-0">
          {/* Backdrop (hidden when printing) */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity print:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Modal Ledger */}
          <div
            data-lenis-prevent
            className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-ink-600 bg-ink-900 shadow-2xl overflow-hidden print:max-h-none print:w-full print:max-w-none print:border-none print:bg-white print:p-0 print:text-black print:shadow-none"
          >
            {/* Modal Header & Print Action */}
            <div className="flex items-center justify-between border-b border-ink-700 bg-ink-850 px-6 py-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-lime-400" />
                <h3 className="text-base font-semibold text-bone-50">Statement of Account</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn btn-primary h-8 gap-1.5 px-3.5 text-xs cursor-pointer shadow-md"
                >
                  <Printer size={13} />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-bone-400 hover:bg-ink-700 hover:text-bone-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Statement Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 print:overflow-visible print:p-8">
              {/* Agency Letterhead */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-700 pb-6 print:border-gray-300">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-bone-50 print:text-black">
                    {agencyName}
                  </h2>
                  <p className="mt-1 text-xs text-bone-400 print:text-gray-600">
                    Official Accounting &amp; Billing Statement
                  </p>
                </div>

                <div className="text-right">
                  <p className="mono-tag text-xs font-semibold uppercase text-lime-400 print:text-gray-800">
                    Statement Date
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-bone-100 print:text-black">
                    {todayFormatted}
                  </p>
                </div>
              </div>

              {/* Client & Account Details */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-ink-700/80 bg-ink-800/40 p-4 print:border-gray-300 print:bg-gray-50">
                <div>
                  <p className="mono-tag text-[10px] text-bone-400 print:text-gray-500 uppercase">
                    Account Name
                  </p>
                  <p className="mt-1 text-base font-semibold text-bone-100 print:text-black">
                    {clientName}
                  </p>
                  {companyName && (
                    <p className="text-xs text-bone-300 print:text-gray-700">{companyName}</p>
                  )}
                </div>

                <div className="text-right">
                  <p className="mono-tag text-[10px] text-bone-400 print:text-gray-500 uppercase">
                    Account Status
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-lime-400 print:text-green-700">
                    <CheckCircle2 size={13} /> Active Client Account
                  </p>
                </div>
              </div>

              {/* Financial Balance Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-ink-700 bg-ink-800/30 p-3.5 print:border-gray-300 print:bg-white">
                  <p className="mono-tag text-[10px] text-bone-400 print:text-gray-500 uppercase">
                    Contract Value
                  </p>
                  <p className="mt-1 text-base font-bold font-mono text-bone-50 print:text-black">
                    {moneyMulti(billing.contractValue, "—")}
                  </p>
                </div>

                <div className="rounded-xl border border-ink-700 bg-ink-800/30 p-3.5 print:border-gray-300 print:bg-white">
                  <p className="mono-tag text-[10px] text-bone-400 print:text-gray-500 uppercase">
                    Total Paid
                  </p>
                  <p className="mt-1 text-base font-bold font-mono text-emerald-400 print:text-green-700">
                    {moneyMulti(billing.totalPaid, "—")}
                  </p>
                </div>

                <div className="rounded-xl border border-ink-700 bg-ink-800/30 p-3.5 print:border-gray-300 print:bg-white">
                  <p className="mono-tag text-[10px] text-bone-400 print:text-gray-500 uppercase">
                    Total Outstanding
                  </p>
                  <p className="mt-1 text-base font-bold font-mono text-amber-400 print:text-amber-800">
                    {billing.totalOwed.length ? moneyMulti(billing.totalOwed) : "Settled in Full"}
                  </p>
                </div>
              </div>

              {/* Itemized Chronological Invoices Ledger */}
              <div>
                <h4 className="mono-tag mb-3 text-xs font-semibold uppercase tracking-wider text-bone-300 print:text-gray-700">
                  Itemized Transactions &amp; Invoices Ledger ({billing.invoices.length})
                </h4>

                <div className="overflow-x-auto rounded-xl border border-ink-700 print:border-gray-300">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-ink-700 bg-ink-850 print:border-gray-300 print:bg-gray-100">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold text-bone-300 print:text-gray-800">Invoice #</th>
                        <th className="px-3.5 py-2.5 font-semibold text-bone-300 print:text-gray-800">Issue Date</th>
                        <th className="px-3.5 py-2.5 font-semibold text-bone-300 print:text-gray-800">Description</th>
                        <th className="px-3.5 py-2.5 font-semibold text-bone-300 print:text-gray-800">Due Date</th>
                        <th className="px-3.5 py-2.5 font-semibold text-bone-300 print:text-gray-800">Status</th>
                        <th className="px-3.5 py-2.5 text-right font-semibold text-bone-300 print:text-gray-800">Billed</th>
                        <th className="px-3.5 py-2.5 text-right font-semibold text-bone-300 print:text-gray-800">Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-700/60 print:divide-gray-200">
                      {billing.invoices.map((inv: any) => {
                        const isPaid = inv.status === "paid" || Number(inv.amount_paid) >= Number(inv.total);
                        const cur = inv.currency || "USD";

                        return (
                          <tr key={inv.id} className="hover:bg-ink-800/30 print:hover:bg-transparent">
                            <td className="px-3.5 py-2.5 font-mono font-medium text-bone-100 print:text-black">
                              {inv.invoice_number || `#${inv.id.slice(0, 8)}`}
                            </td>
                            <td className="px-3.5 py-2.5 text-bone-400 print:text-gray-600">
                              {fmtDate(inv.created_at)}
                            </td>
                            <td className="px-3.5 py-2.5 text-bone-200 print:text-gray-800 max-w-[200px] truncate">
                              {inv.title || inv.origin_label || "Services Agreement"}
                            </td>
                            <td className="px-3.5 py-2.5 text-bone-400 print:text-gray-600">
                              {inv.due_date ? fmtDate(inv.due_date) : "On receipt"}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span
                                className={`mono-tag inline-block rounded px-1.5 py-0.2 text-[10px] uppercase font-semibold ${
                                  isPaid
                                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 print:text-green-800"
                                    : "bg-amber-500/15 text-amber-300 border border-amber-500/30 print:text-amber-800"
                                }`}
                              >
                                {isPaid ? "Paid" : String(inv.status).replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-medium text-bone-100 print:text-black">
                              {money(Number(inv.total || 0), cur)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-medium text-emerald-400 print:text-green-700">
                              {money(Number(inv.amount_paid || 0), cur)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Note */}
              <div className="border-t border-ink-700 pt-4 text-center print:border-gray-300">
                <p className="text-[11px] text-bone-400 print:text-gray-500">
                  This statement reflects all billed invoices, payments, and account balances recorded as of {todayFormatted}. For queries or wire confirmation, please contact our accounts department.
                </p>
              </div>
            </div>

            {/* Modal Footer (hidden when printing) */}
            <div className="flex items-center justify-between border-t border-ink-700 bg-ink-850 px-6 py-3 print:hidden">
              <span className="text-xs text-bone-400">
                Print stylesheet configured for standard A4 / US Letter.
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-outline h-8 px-4 text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
