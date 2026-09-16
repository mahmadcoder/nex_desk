"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowRight,
  X,
  Calendar,
  DollarSign,
  Briefcase,
  FileSignature,
} from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";
import { convertInternToPermanent } from "@/lib/actions/cms";

const SENIORITY_OPTIONS = [
  { value: "Junior", label: "Junior" },
  { value: "Mid-Level", label: "Mid-Level" },
  { value: "Senior", label: "Senior" },
  { value: "Lead / Head", label: "Lead / Head" },
];

const TYPE_OPTIONS = [
  { value: "Full-Time", label: "Full-Time" },
  { value: "Part-Time", label: "Part-Time" },
  { value: "Contract", label: "Contract" },
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "PKR", label: "PKR (Rs)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "AED", label: "AED (د.إ)" },
];

interface ConvertInternDialogProps {
  employee: {
    id: string;
    full_name: string;
    job_title?: string | null;
    seniority?: string | null;
    employment_type?: string | null;
    salary_amount?: number | null;
    salary_currency?: string | null;
  };
  triggerLabel?: string;
  triggerClassName?: string;
  buttonSize?: "xs" | "sm" | "md";
  onSuccess?: () => void;
}

export default function ConvertInternDialog({
  employee,
  triggerLabel = "Promote to Job",
  triggerClassName,
  buttonSize = "sm",
  onSuccess,
}: ConvertInternDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Clean initial suggested title by stripping "Intern" or "Internship"
  const defaultTitle = (employee.job_title || "Specialist")
    .replace(/\s*intern(ship)?\s*/gi, " ")
    .trim() || employee.job_title || "Junior Developer";

  const [jobTitle, setJobTitle] = useState(defaultTitle);
  const [seniority, setSeniority] = useState(
    employee.seniority && employee.seniority !== "Intern" ? employee.seniority : "Junior"
  );
  const [employmentType, setEmploymentType] = useState(
    employee.employment_type && employee.employment_type !== "Internship"
      ? employee.employment_type
      : "Full-Time"
  );
  const [salaryAmount, setSalaryAmount] = useState<number>(
    employee.salary_amount ? Number(employee.salary_amount) : 2500
  );
  const [salaryCurrency, setSalaryCurrency] = useState(employee.salary_currency || "USD");
  const [effectiveDate, setEffectiveDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [issueNewOffer, setIssueNewOffer] = useState(true);

  const handleConvert = () => {
    if (!jobTitle.trim()) {
      toast.error("Please enter a new job title.");
      return;
    }

    startTransition(async () => {
      try {
        await convertInternToPermanent(employee.id, {
          job_title: jobTitle.trim(),
          seniority,
          employment_type: employmentType,
          salary_amount: Number(salaryAmount) || 0,
          salary_currency: salaryCurrency,
          effective_date: effectiveDate,
          issue_new_offer: issueNewOffer,
        });

        toast.success(
          `🎉 ${employee.full_name} has been promoted to permanent ${jobTitle} (${seniority})!`
        );
        setIsOpen(false);
        onSuccess?.();
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Failed to convert intern to permanent role.");
      }
    });
  };

  const btnPadding =
    buttonSize === "xs"
      ? "px-2 py-0.5 text-[10px]"
      : buttonSize === "md"
      ? "px-4 py-2 text-sm"
      : "px-2.5 py-1 text-xs";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          triggerClassName ||
          `inline-flex items-center gap-1.5 rounded-lg border border-lime-400/40 bg-lime-400/10 font-medium text-lime-400 transition-all hover:bg-lime-400/20 hover:border-lime-400/60 ${btnPadding}`
        }
      >
        <Sparkles size={12} className="shrink-0 text-lime-400" />
        <span>{triggerLabel}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="card relative my-auto w-full max-w-lg space-y-4 border-ink-600 bg-ink-900 p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-ink-700 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl border border-lime-400/30 bg-lime-400/10 p-2 text-lime-400">
                  <Sparkles size={18} />
                </div>
                <div>
                  <span className="mono-tag text-[10px] text-lime-400">Career Advancement</span>
                  <h2 className="text-base font-semibold text-bone-50">
                    Promote Intern to Permanent Staff
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-bone-400 transition-colors hover:bg-ink-800 hover:text-bone-50"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-bone-300">
              Converting{" "}
              <strong className="text-bone-100">{employee.full_name}</strong> from an
              internship to a regular permanent contract. Their profile and compensation will be updated
              immediately.
            </p>

            {/* Form Fields */}
            <div className="space-y-3.5">
              {/* Job Title */}
              <div>
                <label className="mono-tag mb-1 block text-xs">Permanent Job Title *</label>
                <div className="relative">
                  <Briefcase size={14} className="absolute left-3 top-2.5 text-bone-500" />
                  <input
                    type="text"
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 py-2 pl-9 pr-3 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                    placeholder="e.g. Junior Full-Stack Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
              </div>

              {/* Seniority & Employment Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mono-tag mb-1 block text-xs">Seniority Level</label>
                  <CustomSelect
                    options={SENIORITY_OPTIONS}
                    value={seniority}
                    onChange={(val) => setSeniority(val)}
                  />
                </div>
                <div>
                  <label className="mono-tag mb-1 block text-xs">Employment Type</label>
                  <CustomSelect
                    options={TYPE_OPTIONS}
                    value={employmentType}
                    onChange={(val) => setEmploymentType(val)}
                  />
                </div>
              </div>

              {/* Monthly Salary & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mono-tag mb-1 block text-xs">Monthly Salary</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-2.5 text-bone-500" />
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-lg border border-ink-500 bg-ink-800 py-2 pl-9 pr-3 font-mono text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                      value={salaryAmount}
                      onChange={(e) => setSalaryAmount(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <label className="mono-tag mb-1 block text-xs">Currency</label>
                  <CustomSelect
                    options={CURRENCY_OPTIONS}
                    value={salaryCurrency}
                    onChange={(val) => setSalaryCurrency(val)}
                  />
                </div>
              </div>

              {/* Effective Date */}
              <div>
                <label className="mono-tag mb-1 block text-xs">Effective Promotion Date</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-2.5 text-bone-500" />
                  <input
                    type="date"
                    className="w-full rounded-lg border border-ink-500 bg-ink-800 py-2 pl-9 pr-3 font-mono text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Issue New Offer Letter Checkbox */}
              <div className="rounded-xl border border-ink-700 bg-ink-800/60 p-3">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={issueNewOffer}
                    onChange={(e) => setIssueNewOffer(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-ink-600 bg-ink-900 text-lime-400 accent-lime-400"
                  />
                  <div className="space-y-0.5">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-bone-100">
                      <FileSignature size={13} className="text-lime-400" />
                      Issue New Permanent Offer Letter
                    </span>
                    <p className="text-[11px] leading-relaxed text-bone-400">
                      Resets digital acceptance so the employee can review and sign their official permanent
                      employment agreement directly in their staff portal.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-ink-700 pt-3.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={pending}
                className="btn h-9 px-3.5 text-xs text-bone-300 hover:text-bone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvert}
                disabled={pending}
                className="btn btn-primary h-9 px-4 text-xs font-semibold flex items-center gap-1.5"
              >
                {pending ? (
                  "Converting..."
                ) : (
                  <>
                    <span>Confirm Promotion</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
