"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { recordPayment } from "@/lib/actions";
import { money } from "@/lib/utils";

const field = "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm focus:border-lime-400 focus:outline-none";

const METHODS = [
  ["bank_transfer", "Bank transfer"], ["jazzcash", "JazzCash"], ["easypaisa", "Easypaisa"],
  ["wise", "Wise"], ["payoneer", "Payoneer"], ["stripe", "Stripe"],
  ["paypal", "PayPal"], ["cash", "Cash"], ["other", "Other"],
];

export default function PaymentDialog({
  invoice,
}: { invoice: { id: string; invoice_no: string; currency: string; balance: number; client_id: string } }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const [f, setF] = useState({
    amount: invoice.balance,
    method: "bank_transfer",
    reference: "",
    paid_on: new Date().toISOString().slice(0, 10),
    note: "",
  });
  const [notify, setNotify] = useState(true);

  const save = () => {
    if (!f.amount || f.amount <= 0) return toast.error("Enter the amount received.");
    start(async () => {
      try {
        await recordPayment({
          invoice_id: invoice.id,
          client_id: invoice.client_id,
          currency: invoice.currency,
          ...f,
          amount: Number(f.amount),
        }, notify);
        toast.success(notify ? "Payment recorded. Receipt sent to the client." : "Payment recorded.");
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't record that payment.");
      }
    });
  };

  if (!open) {
    return <button className="btn btn-primary h-8 px-3 text-xs" onClick={() => setOpen(true)}>Record payment</button>;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-6" onClick={() => setOpen(false)}>
      <div className="card w-full max-w-md p-7 text-left" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg">Record payment</h2>
        <p className="mt-1 text-sm text-bone-400">
          Against {invoice.invoice_no} · {money(invoice.balance, invoice.currency)} outstanding
        </p>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mono-tag mb-1.5 block">Amount received</label>
              <input className={field} type="number" min={0} value={f.amount}
                onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mono-tag mb-1.5 block">Date paid</label>
              <input className={field} type="date" value={f.paid_on}
                onChange={(e) => setF({ ...f, paid_on: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="mono-tag mb-1.5 block">Method</label>
            <select className={field} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
              {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="mono-tag mb-1.5 block">Reference / transaction ID</label>
            <input className={field} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })}
              placeholder="Appears on the receipt as proof" />
          </div>

          <div>
            <label className="mono-tag mb-1.5 block">Internal note</label>
            <input className={field} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 border-t border-ink-600 pt-4 text-xs text-bone-400">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)}
              className="mt-0.5 accent-[color:var(--color-lime-400)]" />
            Email the client a receipt PDF with the date, method, reference and remaining balance.
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="btn h-10" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-primary h-10" onClick={save} disabled={pending}>
            {pending ? "Recording…" : "Record payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
