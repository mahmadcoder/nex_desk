"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { recordPayment } from "@/lib/actions";
import { money } from "@/lib/utils";

import Modal from "@/components/admin/Modal";
import PaymentProofUpload from "@/components/admin/PaymentProofUpload";

import CustomSelect from "@/components/ui/CustomSelect";

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
    // What the bank kept on the way in. Recorded separately because the
    // client DID pay the full amount — this must never reduce what the
    // invoice counts as settled, only what a refund can draw on.
    fee: 0,
    method: "bank_transfer",
    reference: "",
    paid_on: new Date().toISOString().slice(0, 10),
    proof_url: "",
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

  return (
    <>
      <button className="btn btn-primary h-8 px-3 text-xs" onClick={() => setOpen(true)}>
        Record payment
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        title="Record payment"
        eyebrow="Payments"
        description={`Against ${invoice.invoice_no} · ${money(invoice.balance, invoice.currency)} outstanding`}
        footer={
          <>
            <button className="btn h-10" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
            <button className="btn btn-primary h-10" onClick={save} disabled={pending}>
              {pending ? "Recording…" : "Record payment"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Stacks on narrow phones rather than cramming two fields side by side. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mono-tag mb-1.5 block">Amount received</label>
              <input className={field} type="number" min={0} value={f.amount}
                onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mono-tag mb-1.5 block">Bank charge deducted</label>
              <input className={field} type="number" min={0} step="0.01" value={f.fee}
                onChange={(e) => setF({ ...f, fee: Number(e.target.value) })} />
              <p className="mt-1 text-[11px] leading-relaxed text-bone-400">
                Optional. What the bank or gateway took, so {money(Math.max(0, Number(f.amount) - Number(f.fee)), invoice.currency)} actually
                reached you. The invoice still counts the full amount as paid.
              </p>
            </div>
            <div>
              <label className="mono-tag mb-1.5 block">Date paid</label>
              <input className={field} type="date" value={f.paid_on}
                onChange={(e) => setF({ ...f, paid_on: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="mono-tag mb-1.5 block">Method</label>
            <CustomSelect
              options={METHODS.map(([v, l]) => ({ value: v, label: l }))}
              value={f.method}
              onChange={(val) => setF({ ...f, method: val })}
            />
          </div>

          <div>
            <label className="mono-tag mb-1.5 block">Reference / transaction ID</label>
            <input className={field} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })}
              placeholder="Appears on the receipt as proof" />
          </div>

          <PaymentProofUpload
            initialUrl={f.proof_url}
            onUploadComplete={(url) => setF({ ...f, proof_url: url })}
          />

          <div>
            <label className="mono-tag mb-1.5 block">Internal note</label>
            <input className={field} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 border-t border-ink-600 pt-4 text-xs text-bone-300">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)}
              className="mt-0.5 accent-[color:var(--color-lime-400)]" />
            Email the client a receipt PDF with the date, method, reference and remaining balance.
          </label>
        </div>
      </Modal>
    </>
  );
}
