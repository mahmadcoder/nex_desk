"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  Building2,
  Copy,
  Check,
  CreditCard,
  FileCheck2,
  Clock,
  Upload,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { money } from "@/lib/utils";
import { fmtDate } from "@/lib/datetime";
import { Badge } from "@/components/admin/ui";
import Modal from "@/components/admin/Modal";
import PaymentProofUpload from "@/components/admin/PaymentProofUpload";
import { submitInvoicePaymentProof } from "@/lib/actions/portal";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ClientInvoiceRowProps {
  invoice: {
    id: string;
    invoice_no: string;
    total: number;
    amount_paid: number;
    currency: string;
    due_date: string | null;
    status: string;
    origin_label?: string | null;
    has_proof?: boolean;
    proof_submitted_at?: string | null;
  };
  bankDetails?: Record<string, string> | null;
  companyName?: string;
}

export default function ClientInvoiceRow({
  invoice,
  bankDetails,
  companyName = "Nex Desk",
}: ClientInvoiceRowProps) {
  const router = useRouter();
  const [openPayModal, setOpenPayModal] = useState(false);
  const [pending, startTransition] = useTransition();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const balance = Math.max(0, Number(invoice.total) - Number(invoice.amount_paid));
  const isPaid = invoice.status === "paid" || balance <= 0;

  const copyToClipboard = (key: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied ${key} to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmitProof = () => {
    if (!proofUrl) {
      toast.error("Please upload your payment screenshot or wire receipt first.");
      return;
    }

    startTransition(async () => {
      const res = await submitInvoicePaymentProof({
        invoiceId: invoice.id,
        proofUrl,
        reference,
        notes,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to record payment proof.");
        return;
      }

      toast.success("Payment receipt submitted! Nex Desk finance will verify and update status.");
      setOpenPayModal(false);
      router.refresh();
    });
  };

  const defaultBank = {
    "Beneficiary / Account Title": companyName || "Nex Desk",
    "Bank Name": "Standard Chartered / Agency Wire",
    "IBAN / Account Number": "PK00SCBL0000001234567801",
    "SWIFT / BIC Code": "SCBLPKKXXXX",
    "Branch / Country": "Multan, Pakistan",
  };

  const bankEntries = Object.entries(
    bankDetails && Object.keys(bankDetails).length > 0 ? bankDetails : defaultBank
  ).filter(([_, v]) => Boolean(v && String(v).trim()));

  return (
    <>
      <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 py-4 text-sm">
        {/* Invoice Info */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-bone-100">
              {invoice.invoice_no}
            </span>
            {invoice.origin_label && (
              <span className="mono-tag rounded-full border border-ink-500 bg-ink-800/80 px-2 py-0.5 text-[10px] leading-none text-bone-300">
                {invoice.origin_label}
              </span>
            )}
            {invoice.has_proof && !isPaid && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                <Clock size={11} /> Verification Pending
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-bone-300">
            Paid:{" "}
            <strong className="text-bone-100">
              {money(Number(invoice.amount_paid), invoice.currency)}
            </strong>{" "}
            / Total:{" "}
            <strong className="text-bone-100">
              {money(Number(invoice.total), invoice.currency)}
            </strong>
            {invoice.due_date ? ` · due ${fmtDate(invoice.due_date)}` : ""}
          </p>
        </div>

        {/* Status & Actions */}
        <div className="flex shrink-0 items-center gap-2.5">
          <Badge>{invoice.status}</Badge>

          {/* Direct PDF Download */}
          <a
            href={`/api/portal/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="mono-tag inline-flex items-center gap-1 rounded-md border border-ink-600 bg-ink-800/60 px-2.5 py-1.5 text-xs text-bone-200 transition-colors hover:border-lime-400 hover:text-lime-400"
            title="Download Invoice PDF"
          >
            <Download size={13} /> PDF
          </a>

          {/* Pay / Transfer Instructions Button */}
          {!isPaid && (
            <button
              onClick={() => setOpenPayModal(true)}
              className="btn btn-primary h-8 gap-1.5 px-3 text-xs"
            >
              <CreditCard size={13} /> Pay / Wire Info
            </button>
          )}
        </div>
      </li>

      {/* Payment & Bank Details Modal */}
      <Modal
        open={openPayModal}
        onClose={() => setOpenPayModal(false)}
        pending={pending}
        size="lg"
        title={`Payment & Wire Details — ${invoice.invoice_no}`}
        eyebrow="Invoice Settlement"
        description={`Balance Due: ${money(balance, invoice.currency)} · Due ${invoice.due_date ? fmtDate(invoice.due_date) : "upon receipt"}`}
        footer={
          <>
            <button
              className="btn h-10"
              onClick={() => setOpenPayModal(false)}
              disabled={pending}
            >
              Close
            </button>
            <button
              className="btn btn-primary h-10 gap-1.5"
              onClick={handleSubmitProof}
              disabled={pending || !proofUrl}
            >
              {pending ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <FileCheck2 size={14} /> Submit Payment Receipt
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Status Note if Proof already uploaded */}
          {invoice.has_proof && (
            <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-200 flex items-start gap-2">
              <Clock size={16} className="shrink-0 text-amber-300 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-100">Receipt Under Review</p>
                <p className="mt-0.5 leading-relaxed text-amber-200/90">
                  You previously uploaded a payment receipt for this invoice. Nex Desk finance is
                  reconciling it with our incoming bank statements. You can submit an updated proof
                  below if needed.
                </p>
              </div>
            </div>
          )}

          {/* Wire Reference Alert */}
          <div className="rounded-lg border border-lime-400/30 bg-lime-400/[0.06] p-3.5">
            <p className="text-xs text-bone-300">
              Please include your invoice number as the payment reference or transfer memo:
            </p>
            <div className="mt-2 flex items-center justify-between rounded bg-ink-950/80 px-3 py-1.5 font-mono text-sm font-semibold text-lime-400 border border-lime-400/40">
              <span>{invoice.invoice_no}</span>
              <button
                type="button"
                onClick={() => copyToClipboard("Invoice Number", invoice.invoice_no)}
                className="text-xs text-bone-400 hover:text-bone-100 transition-colors flex items-center gap-1"
              >
                {copiedKey === "Invoice Number" ? (
                  <Check size={13} className="text-emerald-400" />
                ) : (
                  <Copy size={13} />
                )}
                Copy
              </button>
            </div>
          </div>

          {/* Bank Transfer Details Cards */}
          <div>
            <h3 className="mono-tag mb-2 flex items-center gap-1.5 text-xs text-bone-200">
              <Building2 size={14} className="text-lime-400" /> Official Bank Transfer Details
            </h3>

            <div className="space-y-2 rounded-lg border border-ink-600 bg-ink-900/50 p-3.5">
              {bankEntries.map(([k, v]) => (
                <div
                  key={k}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800/80 pb-2 last:border-0 last:pb-0 text-xs"
                >
                  <span className="text-bone-400 font-mono">{k}</span>
                  <div className="flex items-center gap-2 font-mono font-medium text-bone-100">
                    <span className="select-all">{String(v)}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(k, String(v))}
                      className="text-bone-500 hover:text-lime-400 transition-colors p-1"
                      title={`Copy ${k}`}
                    >
                      {copiedKey === k ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload Transfer Receipt */}
          <div className="border-t border-ink-700 pt-4">
            <h3 className="mono-tag mb-2 flex items-center gap-1.5 text-xs text-bone-200">
              <Upload size={14} className="text-lime-400" /> Upload Payment Receipt / Wire Proof
            </h3>
            <p className="mb-3 text-[11px] text-bone-400 leading-relaxed">
              Attach your bank transfer receipt, transaction screenshot, or wire advice. Once
              verified, your invoice status updates to Settled and your official receipt is issued.
            </p>

            <PaymentProofUpload
              initialUrl={proofUrl}
              onUploadComplete={(url) => setProofUrl(url)}
            />

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mono-tag mb-1 block text-[10px]">
                  Transaction Reference / UTR (Optional)
                </label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. FT2609... or wire ref"
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs focus:border-lime-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mono-tag mb-1 block text-[10px]">
                  Additional Notes (Optional)
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Sent via Wise / SCB Wire"
                  className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs focus:border-lime-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
