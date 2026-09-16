"use client";

import { useState, useTransition, useMemo } from "react";
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
  Landmark,
} from "lucide-react";
import { money } from "@/lib/utils";
import { fmtDate } from "@/lib/datetime";
import { Badge } from "@/components/admin/ui";
import Modal from "@/components/admin/Modal";
import PaymentProofUpload from "@/components/admin/PaymentProofUpload";
import { submitInvoicePaymentProof } from "@/lib/actions/portal";
import { AgencyBankAccount } from "@/types/bank";
import { normalizeBankDetails } from "@/lib/bank";

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
  bankAccounts?: AgencyBankAccount[];
  bankDetails?: Record<string, string> | null;
  companyName?: string;
}

export default function ClientInvoiceRow({
  invoice,
  bankAccounts,
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

  const accounts: AgencyBankAccount[] = useMemo(() => {
    if (bankAccounts && bankAccounts.length > 0) return bankAccounts;
    return normalizeBankDetails(bankDetails, companyName);
  }, [bankAccounts, bankDetails, companyName]);

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    const matching = accounts.find(
      (a) => a.currency === invoice.currency.toUpperCase() && a.is_active !== false
    );
    if (matching) return matching.id;
    const def = accounts.find((a) => a.is_default && a.is_active !== false);
    return def ? def.id : accounts[0]?.id || "";
  });

  const currentAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

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
      const fullNotes = [
        notes.trim(),
        currentAccount ? `Payment sent via: ${currentAccount.name} (${currentAccount.currency})` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await submitInvoicePaymentProof({
        invoiceId: invoice.id,
        proofUrl,
        reference,
        notes: fullNotes,
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="mono-tag flex items-center gap-1.5 text-xs text-bone-200">
                <Building2 size={14} className="text-lime-400" /> Official Bank Transfer Details
              </h3>
              {currentAccount && (
                <span className="mono-tag rounded border border-lime-400/30 bg-lime-400/10 px-2 py-0.5 text-[10px] text-lime-400 font-semibold">
                  {currentAccount.currency}
                </span>
              )}
            </div>

            {/* Account Switcher Tabs (if multiple accounts available for this client) */}
            {accounts.length > 1 && (
              <div className="mb-3">
                <p className="mono-tag text-[10px] text-bone-400 mb-1.5">Choose Payment Account:</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-admin-scrollbar">
                  {accounts.map((acc) => {
                    const isSelected = acc.id === currentAccount?.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setSelectedAccountId(acc.id)}
                        className={`mono-tag inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? "border-lime-400 bg-lime-400/15 text-lime-300 font-semibold shadow-xs"
                            : "border-ink-600 bg-ink-900/80 text-bone-300 hover:border-ink-500 hover:text-bone-100"
                        }`}
                      >
                        <Building2 size={12} className={isSelected ? "text-lime-400" : "text-bone-400"} />
                        <span>{acc.name}</span>
                        <span className="rounded bg-ink-800 px-1 py-0.2 text-[9px] text-lime-400 font-mono">
                          {acc.currency}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {currentAccount ? (
              <div className="space-y-2 rounded-lg border border-ink-600 bg-ink-900/50 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800/80 pb-2 text-xs">
                  <span className="text-bone-400 font-mono">Beneficiary / Title</span>
                  <div className="flex items-center gap-2 font-mono font-medium text-bone-100">
                    <span className="select-all">{currentAccount.beneficiary}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("Account Title", currentAccount.beneficiary)}
                      className="text-bone-500 hover:text-lime-400 transition-colors p-1 cursor-pointer"
                      title="Copy Account Title"
                    >
                      {copiedKey === "Account Title" ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800/80 pb-2 text-xs">
                  <span className="text-bone-400 font-mono">Bank Name</span>
                  <div className="flex items-center gap-2 font-mono font-medium text-bone-100">
                    <span className="select-all">{currentAccount.bank_name}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("Bank Name", currentAccount.bank_name)}
                      className="text-bone-500 hover:text-lime-400 transition-colors p-1 cursor-pointer"
                      title="Copy Bank Name"
                    >
                      {copiedKey === "Bank Name" ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800/80 pb-2 text-xs">
                  <span className="text-bone-400 font-mono">Account Number / IBAN</span>
                  <div className="flex items-center gap-2 font-mono font-medium text-bone-100">
                    <span className="select-all">
                      {currentAccount.iban || currentAccount.account_number}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          "Account Number",
                          currentAccount.iban || currentAccount.account_number
                        )
                      }
                      className="text-bone-500 hover:text-lime-400 transition-colors p-1 cursor-pointer"
                      title="Copy Account Number"
                    >
                      {copiedKey === "Account Number" ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                </div>

                {currentAccount.swift && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800/80 pb-2 text-xs">
                    <span className="text-bone-400 font-mono">SWIFT / BIC</span>
                    <div className="flex items-center gap-2 font-mono font-medium text-bone-100">
                      <span className="select-all">{currentAccount.swift}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("SWIFT Code", currentAccount.swift!)}
                        className="text-bone-500 hover:text-lime-400 transition-colors p-1 cursor-pointer"
                        title="Copy SWIFT Code"
                      >
                        {copiedKey === "SWIFT Code" ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {currentAccount.routing_number && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800/80 pb-2 text-xs">
                    <span className="text-bone-400 font-mono">Routing # / Sort Code</span>
                    <div className="flex items-center gap-2 font-mono font-medium text-bone-100">
                      <span className="select-all">{currentAccount.routing_number}</span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard("Routing Number", currentAccount.routing_number!)
                        }
                        className="text-bone-500 hover:text-lime-400 transition-colors p-1 cursor-pointer"
                        title="Copy Routing Number"
                      >
                        {copiedKey === "Routing Number" ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {currentAccount.branch && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800/80 pb-2 text-xs">
                    <span className="text-bone-400 font-mono">Branch / Country</span>
                    <span className="font-mono text-bone-100 font-medium">
                      {currentAccount.branch}
                    </span>
                  </div>
                )}

                {currentAccount.instructions && (
                  <div className="pt-2 text-[11px] text-bone-400 leading-relaxed border-t border-ink-800/80">
                    <span className="font-medium text-bone-300">Payment Memo Note: </span>
                    {currentAccount.instructions}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 text-xs text-bone-400 border border-ink-700 rounded bg-ink-900/40">
                Please contact Nex Desk support for payment transfer details.
              </div>
            )}
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
