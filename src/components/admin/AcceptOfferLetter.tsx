"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileSignature,
  CheckCircle2,
  Download,
  Loader2,
  FileText,
  Clock,
  Shield,
  Building2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { fmtDate } from "@/lib/datetime";
import { money } from "@/lib/utils";
import Modal from "@/components/admin/Modal";
import SignaturePad from "@/components/ui/SignaturePad";
import { acceptStaffOfferLetter, StaffOfferAcceptance } from "@/lib/actions/staffOffer";

interface AcceptOfferLetterProps {
  employee: {
    id: string;
    full_name: string;
    job_title: string;
    seniority?: string | null;
    employment_type?: string | null;
    salary_amount?: number | null;
    salary_currency?: string | null;
    joining_date?: string | null;
    city?: string | null;
    country?: string | null;
  };
  offerStatus: StaffOfferAcceptance;
  variant?: "banner" | "card" | "button";
  triggerLabel?: string;
  triggerClassName?: string;
}

export default function AcceptOfferLetter({
  employee,
  offerStatus,
  variant = "card",
  triggerLabel,
  triggerClassName,
}: AcceptOfferLetterProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const [typedName, setTypedName] = useState(offerStatus.signedName || employee.full_name || "");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const salary = Number(employee.salary_amount ?? 0);
  const currency = employee.salary_currency || "USD";
  const location = [employee.city, employee.country].filter(Boolean).join(", ") || "Remote";

  const hasSignature = Boolean(signatureData && signatureData.trim().length > 0);
  const hasTypedName = Boolean(typedName && typedName.trim().length >= 3);
  const isReadyToSign = Boolean(!pending && hasSignature && hasTypedName && agreed);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/staff-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "offer_letter", id: employee.id }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }));
        toast.error(error || "Could not build the offer letter.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Nex-Desk-Offer-Letter-${employee.full_name.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || "Could not download the offer letter.");
    } finally {
      setDownloading(false);
    }
  };

  const handleAccept = () => {
    if (!signatureData) {
      return toast.error("Please draw your digital signature on the pad.");
    }
    if (!typedName.trim() || typedName.trim().length < 3) {
      return toast.error("Please type your full legal name to sign.");
    }
    if (!agreed) {
      return toast.error("Please check the confirmation box to accept the terms.");
    }

    start(async () => {
      try {
        const res = await acceptStaffOfferLetter(typedName, signatureData);
        if (!res.ok) {
          toast.error(res.error || "Could not accept offer letter.");
          return;
        }

        toast.success("Offer letter signed and accepted successfully!");
        setOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Something went wrong.");
      }
    });
  };

  // 1. ALREADY ACCEPTED STATE
  if (offerStatus.isAccepted) {
    if (variant === "banner") {
      return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <p className="text-xs text-emerald-200">
              Offer letter digitally accepted by <strong>{offerStatus.signedName || employee.full_name}</strong> on{" "}
              {fmtDate(offerStatus.acceptedAt)}.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloading}
            className="mono-tag inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-400/25 transition-colors cursor-pointer"
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Download Signed Copy (PDF)
          </button>
        </div>
      );
    }

    return (
      <section className="card p-5 sm:p-6 border-emerald-400/30 bg-emerald-400/[0.04]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-700/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <h2 className="text-base font-semibold text-bone-50">Employment Offer Letter &amp; Terms</h2>
            </div>
            <p className="mt-1 text-xs text-emerald-300">
              Officially signed and accepted on {fmtDate(offerStatus.acceptedAt)} by {offerStatus.signedName || employee.full_name}.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloading}
            className="btn btn-primary h-9 text-xs gap-1.5"
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Download Signed PDF
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-lg border border-ink-700/60 bg-ink-900/50 p-3">
            <p className="mono-tag text-[10px] text-bone-400">Position</p>
            <p className="mt-1 font-medium text-bone-100">{employee.job_title}</p>
            <p className="text-[11px] text-bone-400">{employee.seniority || "Senior"} · {employee.employment_type || "Full-Time"}</p>
          </div>
          <div className="rounded-lg border border-ink-700/60 bg-ink-900/50 p-3">
            <p className="mono-tag text-[10px] text-bone-400">Monthly Compensation</p>
            <p className="mt-1 font-medium text-bone-100">{salary > 0 ? `${money(salary, currency)} / month` : "As agreed"}</p>
            <p className="text-[11px] text-bone-400">Paid monthly</p>
          </div>
          <div className="rounded-lg border border-ink-700/60 bg-ink-900/50 p-3">
            <p className="mono-tag text-[10px] text-bone-400">Start Date &amp; Base</p>
            <p className="mt-1 font-medium text-bone-100">{fmtDate(employee.joining_date)}</p>
            <p className="text-[11px] text-bone-400">{location}</p>
          </div>
        </div>
      </section>
    );
  }

  // 2. PENDING ACCEPTANCE STATE
  return (
    <>
      {variant === "button" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            triggerClassName ||
            "btn btn-primary h-9 gap-1.5 px-4 text-xs font-semibold shadow-md shadow-lime-400/20"
          }
        >
          <FileSignature size={14} className="shrink-0 text-ink-950" />
          <span>{triggerLabel || "Sign Offer to Check In"}</span>
        </button>
      ) : variant === "banner" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lime-400/40 bg-lime-400/[0.08] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-lime-400/15 text-lime-400 border border-lime-400/30">
              <FileSignature size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-bone-50">Employment Offer Letter Ready for Acceptance</p>
              <p className="mt-0.5 text-[11px] text-bone-300">
                Nex Desk has issued your official offer for <strong className="text-lime-300">{employee.job_title}</strong>. Please review terms and digitally accept.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn btn-primary h-9 gap-1.5 text-xs px-4"
          >
            <FileSignature size={14} /> Review &amp; Sign Offer
          </button>
        </div>
      ) : (
        <section className="card p-5 sm:p-6 border-lime-400/30 bg-lime-400/[0.04]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-700/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSignature size={18} className="text-lime-400" />
                <h2 className="text-base font-semibold text-bone-50">Employment Offer Letter</h2>
                <span className="mono-tag rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300 font-semibold">
                  Action Required
                </span>
              </div>
              <p className="mt-1 text-xs text-bone-300">
                Your official terms of appointment are ready for review and digital signature.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="btn btn-primary h-9 text-xs gap-1.5"
            >
              <FileSignature size={13} /> Review &amp; Sign Offer Letter
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-ink-700/60 bg-ink-900/50 p-3">
              <p className="mono-tag text-[10px] text-bone-400">Position</p>
              <p className="mt-1 font-medium text-bone-100">{employee.job_title}</p>
              <p className="text-[11px] text-bone-400">{employee.seniority || "Senior"} · {employee.employment_type || "Full-Time"}</p>
            </div>
            <div className="rounded-lg border border-ink-700/60 bg-ink-900/50 p-3">
              <p className="mono-tag text-[10px] text-bone-400">Monthly Compensation</p>
              <p className="mt-1 font-medium text-bone-100">{salary > 0 ? `${money(salary, currency)} / month` : "As agreed"}</p>
              <p className="text-[11px] text-bone-400">Monthly gross</p>
            </div>
            <div className="rounded-lg border border-ink-700/60 bg-ink-900/50 p-3">
              <p className="mono-tag text-[10px] text-bone-400">Start Date &amp; Location</p>
              <p className="mt-1 font-medium text-bone-100">{fmtDate(employee.joining_date)}</p>
              <p className="text-[11px] text-bone-400">{location}</p>
            </div>
          </div>
        </section>
      )}

      {/* Review and Acceptance Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        size="lg"
        title="Review & Accept Offer of Employment"
        eyebrow="Nex Desk Agency Appointment"
        description={`Offer for ${employee.full_name} · ${employee.job_title}`}
        footer={
          <>
            <button
              type="button"
              className="btn h-10"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Review Later
            </button>
            <button
              type="button"
              className={`btn h-10 gap-1.5 transition-all duration-200 ${
                isReadyToSign
                  ? "btn-primary shadow-lg shadow-lime-400/25 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  : "opacity-40 cursor-not-allowed bg-ink-800 text-bone-400 border border-ink-600 shadow-none pointer-events-none"
              }`}
              onClick={handleAccept}
              disabled={!isReadyToSign || pending}
            >
              {pending ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Recording Signature…
                </>
              ) : (
                <>
                  <FileSignature size={14} /> Accept &amp; Digitally Sign
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Key Details Summary */}
          <div className="rounded-xl border border-ink-600 bg-ink-900/70 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-ink-700/70 pb-2.5">
              <h3 className="mono-tag flex items-center gap-1.5 text-xs text-lime-400">
                <Building2 size={14} /> Terms of Appointment
              </h3>
              <button
                type="button"
                onClick={downloadPdf}
                disabled={downloading}
                className="mono-tag inline-flex items-center gap-1 text-[11px] text-lime-400 hover:underline cursor-pointer"
              >
                {downloading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                Download Draft PDF
              </button>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
              <div>
                <span className="mono-tag text-[10px] text-bone-400 block">Position &amp; Role</span>
                <span className="font-semibold text-bone-50">{employee.job_title}</span>
                <span className="text-bone-400 block text-[11px]">{employee.seniority || "Senior"} · {employee.employment_type || "Full-Time"}</span>
              </div>
              <div>
                <span className="mono-tag text-[10px] text-bone-400 block">Starting Date</span>
                <span className="font-semibold text-bone-50">{fmtDate(employee.joining_date)}</span>
                <span className="text-bone-400 block text-[11px]">{location}</span>
              </div>
              <div>
                <span className="mono-tag text-[10px] text-bone-400 block">Compensation</span>
                <span className="font-semibold text-bone-50">
                  {salary > 0 ? `${money(salary, currency)} gross per month` : "As agreed in writing"}
                </span>
                <span className="text-bone-400 block text-[11px]">Paid monthly within the first 5 working days</span>
              </div>
              <div>
                <span className="mono-tag text-[10px] text-bone-400 block">Probation &amp; Notice</span>
                <span className="font-semibold text-bone-50">Three months probation</span>
                <span className="text-bone-400 block text-[11px]">One month notice period post-probation</span>
              </div>
            </div>
          </div>

          {/* Legal Clauses Summary Accordion / Callout */}
          <div className="rounded-lg border border-ink-700/70 bg-ink-950/50 p-3.5 text-xs text-bone-300 space-y-2 leading-relaxed">
            <p className="font-medium text-bone-100 flex items-center gap-1.5">
              <Shield size={13} className="text-lime-400" /> Summary of Governing Policies:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-bone-300">
              <li><strong>Confidentiality:</strong> All agency systems, client work, credentials, and business affairs remain strictly confidential during and after employment.</li>
              <li><strong>Intellectual Property:</strong> All software, designs, code, documentation, and assets produced belong exclusively to Nex Desk and its clients.</li>
              <li><strong>Working Hours &amp; Tracking:</strong> Work hours are logged daily via the control panel timers and work logs.</li>
            </ul>
          </div>

          {/* Signature Canvas */}
          <div>
            <label className="mono-tag mb-1.5 block text-xs text-bone-200">
              Draw Your Digital Signature <span className="text-rose-400">*</span>:
            </label>
            <SignaturePad onChange={(dataUrl) => setSignatureData(dataUrl)} />
          </div>

          {/* Typed Name Input */}
          <div>
            <label className="mono-tag mb-1.5 block text-xs text-bone-200">
              Type Full Legal Name to Confirm Acceptance <span className="text-rose-400">*</span>:
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="e.g. Adam Zafar"
              className="w-full rounded-lg border border-ink-600 bg-ink-800 px-3.5 py-2.5 text-sm font-mono text-bone-50 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-bone-400">
              Typing your full legal name acts as a legally binding digital signature under electronic transaction laws.
            </p>
          </div>

          {/* Acceptance Checkbox */}
          <label className="flex items-start gap-2.5 rounded-lg border border-ink-700 bg-ink-900/60 p-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-ink-500 bg-ink-800 text-lime-400 focus:ring-lime-400"
            />
            <span className="text-xs text-bone-200 leading-relaxed">
              I confirm that I have read, understood, and accept all the terms, compensation, and conditions of employment outlined in this offer letter.
            </span>
          </label>

          {/* Live Signing Readiness Checklist */}
          <div className="rounded-lg border border-ink-700/80 bg-ink-950/70 p-3 text-xs space-y-2">
            <p className="mono-tag text-[10px] text-bone-400">Signing Requirements Checklist:</p>
            <div className="grid gap-1.5 sm:grid-cols-3">
              <div
                className={`flex items-center gap-1.5 rounded p-1.5 text-[11px] transition-all ${
                  hasSignature
                    ? "bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-500/20"
                    : "bg-ink-900/50 text-bone-400 border border-ink-800"
                }`}
              >
                {hasSignature ? (
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full border border-bone-500 shrink-0" />
                )}
                <span className="truncate">1. Signature Drawn</span>
              </div>

              <div
                className={`flex items-center gap-1.5 rounded p-1.5 text-[11px] transition-all ${
                  hasTypedName
                    ? "bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-500/20"
                    : "bg-ink-900/50 text-bone-400 border border-ink-800"
                }`}
              >
                {hasTypedName ? (
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full border border-bone-500 shrink-0" />
                )}
                <span className="truncate">2. Full Name Typed</span>
              </div>

              <div
                className={`flex items-center gap-1.5 rounded p-1.5 text-[11px] transition-all ${
                  agreed
                    ? "bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-500/20"
                    : "bg-ink-900/50 text-bone-400 border border-ink-800"
                }`}
              >
                {agreed ? (
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full border border-bone-500 shrink-0" />
                )}
                <span className="truncate">3. Terms Checked</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
