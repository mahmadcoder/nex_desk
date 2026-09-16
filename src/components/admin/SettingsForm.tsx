"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSettings } from "@/lib/actions";
import { CURRENCIES } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import { Badge } from "./ui";
import ImageUpload from "@/components/admin/ImageUpload";
import SignaturePad from "@/components/ui/SignaturePad";
import Modal from "@/components/admin/Modal";
import {
  AlertCircle,
  Trash2,
  PenTool,
  Plus,
  Eye,
  EyeOff,
  Star,
  Landmark,
  Edit2,
  Check,
  Building2,
  X,
} from "lucide-react";
import { AgencyBankAccount } from "@/types/bank";
import { normalizeBankDetails } from "@/lib/bank";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field = "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm focus:border-lime-400 focus:outline-none";
const label = "mono-tag mb-1.5 block";

export default function SettingsForm({ settings, staff }: { settings: any; staff: any[] }) {
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    company_name: settings?.company_name ?? "Nex Desk",
    tagline: settings?.tagline ?? "",
    email: settings?.email ?? "",
    phone: settings?.phone ?? "",
    whatsapp: settings?.whatsapp ?? "",
    address: settings?.address ?? "",
    city: settings?.city ?? "",
    country: settings?.country ?? "Pakistan",
    tax_id: settings?.tax_id ?? "",
    logo_url: settings?.logo_url ?? "",
    admin_signature: settings?.admin_signature ?? "",
    default_currency: settings?.default_currency ?? "PKR",
    tax_percent: settings?.tax_percent ?? 0,
    invoice_prefix: settings?.invoice_prefix ?? "ND",
    email_signature: settings?.email_signature ?? "",
    default_terms: settings?.default_terms ?? "",
    refund_policy: settings?.refund_policy ?? "",
    booking_fee_pct: settings?.booking_fee_pct ?? 25,
    refund_grace_hours: settings?.refund_grace_hours ?? 48,
    work_start: String(settings?.work_start ?? "09:00").slice(0, 5),
    work_end: String(settings?.work_end ?? "18:00").slice(0, 5),
    work_grace_min: settings?.work_grace_min ?? 15,
  });
  const [workDays, setWorkDays] = useState<number[]>(
    Array.isArray(settings?.work_days) && settings.work_days.length
      ? settings.work_days.map(Number)
      : [1, 2, 3, 4, 5]
  );

  const [bankAccounts, setBankAccounts] = useState<AgencyBankAccount[]>(() =>
    normalizeBankDetails(settings?.bank_details, settings?.company_name || "Nex Desk")
  );

  const [isEditingSignature, setIsEditingSignature] = useState(false);

  // Bank Modal State
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBankIndex, setEditingBankIndex] = useState<number | null>(null);
  const [bankForm, setBankForm] = useState<AgencyBankAccount>({
    id: "",
    name: "",
    currency: "USD",
    beneficiary: settings?.company_name || "Nex Desk",
    bank_name: "",
    account_number: "",
    iban: "",
    swift: "",
    routing_number: "",
    branch: "",
    instructions: "",
    is_active: true,
    is_default: false,
  });

  const [initialState, setInitialState] = useState(() =>
    JSON.stringify({ f, workDays, bankAccounts })
  );
  const currentState = JSON.stringify({ f, workDays, bankAccounts });
  const isDirty = currentState !== initialState;

  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const openAddBankModal = () => {
    setEditingBankIndex(null);
    setBankForm({
      id: `acc_${Date.now()}`,
      name: "",
      currency: f.default_currency || "USD",
      beneficiary: f.company_name || "Nex Desk",
      bank_name: "",
      account_number: "",
      iban: "",
      swift: "",
      routing_number: "",
      branch: "",
      instructions: "Please include the invoice number in your wire transfer reference memo.",
      is_active: true,
      is_default: bankAccounts.length === 0,
    });
    setBankModalOpen(true);
  };

  const openEditBankModal = (index: number) => {
    setEditingBankIndex(index);
    setBankForm({ ...bankAccounts[index] });
    setBankModalOpen(true);
  };

  const handleSaveBankForm = () => {
    if (!bankForm.name.trim()) {
      toast.error("Account label / name is required.");
      return;
    }
    if (!bankForm.bank_name.trim()) {
      toast.error("Bank name is required.");
      return;
    }
    if (!bankForm.account_number.trim() && !bankForm.iban?.trim()) {
      toast.error("Account number or IBAN is required.");
      return;
    }

    setBankAccounts((prev) => {
      let updated = [...prev];
      if (editingBankIndex !== null) {
        updated[editingBankIndex] = { ...bankForm };
      } else {
        updated.push({ ...bankForm, id: bankForm.id || `acc_${Date.now()}` });
      }

      // If marked default, unset default on others
      if (bankForm.is_default) {
        updated = updated.map((acc, idx) => ({
          ...acc,
          is_default: editingBankIndex !== null ? idx === editingBankIndex : idx === updated.length - 1,
        }));
      }

      return updated;
    });

    setBankModalOpen(false);
    toast.success(editingBankIndex !== null ? "Bank account updated." : "Bank account added.");
  };

  const toggleBankActive = (index: number) => {
    setBankAccounts((prev) =>
      prev.map((acc, idx) => {
        if (idx !== index) return acc;
        const nextActive = !acc.is_active;
        toast.info(
          nextActive
            ? `“${acc.name}” is now visible on client invoices.`
            : `“${acc.name}” is now hidden from client invoices.`
        );
        return { ...acc, is_active: nextActive };
      })
    );
  };

  const setBankDefault = (index: number) => {
    setBankAccounts((prev) =>
      prev.map((acc, idx) => ({
        ...acc,
        is_default: idx === index,
        // Default accounts should always be active
        is_active: idx === index ? true : acc.is_active,
      }))
    );
    toast.success(`“${bankAccounts[index].name}” set as primary default account.`);
  };

  const deleteBankAccount = (index: number) => {
    if (bankAccounts.length <= 1) {
      toast.error("At least one bank account must be maintained.");
      return;
    }
    const accToDelete = bankAccounts[index];
    setBankAccounts((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      if (accToDelete.is_default && filtered.length > 0) {
        filtered[0].is_default = true;
      }
      return filtered;
    });
    toast.success(`Removed “${accToDelete.name}”.`);
  };

  const save = () =>
    start(async () => {
      try {
        await saveSettings({
          ...f,
          tax_percent: Number(f.tax_percent),
          work_grace_min: Number(f.work_grace_min),
          work_days: workDays.sort((a, b) => a - b),
          bank_details: bankAccounts,
        });
        setInitialState(JSON.stringify({ f, workDays, bankAccounts }));
        toast.success("Settings saved successfully.");
      } catch (e: any) {
        toast.error(e?.message || "Could not save settings.");
      }
    });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card p-6">
        <h2 className="mb-5 text-base">Company</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["company_name", "Company name"], ["email", "Email"], ["phone", "Phone"],
            ["whatsapp", "WhatsApp"], ["city", "City"], ["country", "Country"],
          ].map(([k, l]) => (
            <div key={k}>
              <label className={label}>{l}</label>
              <input className={field} value={(f as any)[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <label className={label}>Tagline</label>
          <input className={field} value={f.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </div>
        <div className="mt-4">
          <label className={label}>Address</label>
          <input className={field} value={f.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="mt-4">
          <label className={label}>Tax / NTN number</label>
          <input
            className={field}
            value={f.tax_id}
            onChange={(e) => set("tax_id", e.target.value)}
            placeholder="Printed on invoices and agreements"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-bone-400">
            You already record the client&rsquo;s tax ID and print it on every document. This is
            yours — it is what lets the business receiving your invoice deduct it.
          </p>
        </div>
        <div className="mt-4">
          <ImageUpload
            label="Logo"
            value={f.logo_url}
            onChange={(url) => set("logo_url", url)}
            folder="brand"
            removeWarning="Documents go back to the drawn Nex Desk mark until you upload another."
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-bone-400">
            Replaces the drawn mark at the top of every PDF. A square PNG with a transparent
            background works best.
          </p>
        </div>

        <div className="mt-5 border-t border-ink-700 pt-5">
          {f.admin_signature && !isEditingSignature ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="mono-tag text-xs text-bone-300">Official Agency Signature</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingSignature(true)}
                    className="mono-tag flex items-center gap-1 text-xs text-lime-400 hover:text-lime-300 transition-colors"
                  >
                    <PenTool size={12} /> Edit / Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      set("admin_signature", "");
                      setIsEditingSignature(false);
                    }}
                    className="mono-tag flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center rounded-lg border border-lime-400/30 bg-ink-900/90 p-4">
                <img src={f.admin_signature} alt="Official Agency Signature" className="max-h-20 object-contain" />
              </div>
              <p className="text-[11px] text-bone-400">
                Active official signature rendered on all generated PDFs under &ldquo;FOR NEX DESK&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {f.admin_signature && isEditingSignature && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingSignature(false)}
                    className="mono-tag text-xs text-bone-400 hover:text-bone-200"
                  >
                    Done editing
                  </button>
                </div>
              )}
              <SignaturePad
                value={f.admin_signature}
                onChange={(sig) => set("admin_signature", sig ?? "")}
                label="Official Agency Signature (for PDFs & agreements)"
                height={120}
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-bone-400">
                Draw, type in cursive, or upload your official agency signature image. This signature is rendered on official PDFs under &ldquo;FOR NEX DESK&rdquo;.
              </p>
            </div>
          )}
        </div>

        <p className="mt-5 border-t border-ink-700 pt-4 text-[11px] leading-relaxed text-bone-400">
          Everything on this card appears on your invoices, agreements and emails.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-base">Billing</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Default currency</label>
            <CustomSelect
              value={f.default_currency}
              onChange={(v) => set("default_currency", v)}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <label className={label}>Tax %</label>
            <input className={field} type="number" value={f.tax_percent} onChange={(e) => set("tax_percent", e.target.value)} />
          </div>
          <div>
            <label className={label}>Invoice prefix</label>
            <input className={field} value={f.invoice_prefix} onChange={(e) => set("invoice_prefix", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-2 text-base">Working hours</h2>
        <p className="mb-5 text-xs leading-relaxed text-bone-400">
          What counts as on time. Attendance is judged against these values every time a
          screen loads and never written down, so widening the grace period corrects past
          days too rather than leaving them flagged under the old rule.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Day starts</label>
            <input className={field} type="time" value={f.work_start} onChange={(e) => set("work_start", e.target.value)} />
          </div>
          <div>
            <label className={label}>Day ends</label>
            <input className={field} type="time" value={f.work_end} onChange={(e) => set("work_end", e.target.value)} />
          </div>
          <div>
            <label className={label}>Grace (minutes)</label>
            <input className={field} type="number" min="0" max="120" value={f.work_grace_min} onChange={(e) => set("work_grace_min", e.target.value)} />
          </div>
        </div>

        <label className={label + " mt-5 block"}>Working days</label>
        <div className="flex flex-wrap gap-2">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => {
            const iso = i + 1;
            const on = workDays.includes(iso);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setWorkDays((p) => (on ? p.filter((x) => x !== iso) : [...p, iso]))}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  on ? "border-lime-400 bg-lime-400 font-medium text-lime-950" : "border-ink-500 text-bone-300 hover:border-ink-400"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-bone-400">
          A non-working day is never marked absent.
        </p>
      </section>

      {/* ── Bank Details & Payment Channels (Multi-Bank Registry) ── */}
      <section className="card p-6 xl:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-600 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-lime-400" />
              <h2 className="text-base font-semibold text-bone-50">
                Bank Details &amp; Payment Methods
              </h2>
            </div>
            <p className="mt-1 text-xs text-bone-400 max-w-2xl leading-relaxed">
              Configure your agency wire details, local accounts, and international channels. Clients use these to settle invoices. You can add multiple accounts (USD, PKR, EUR, GBP, etc.), toggle visibility (Hide/Unhide), edit, or mark a primary default.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddBankModal}
            className="btn btn-primary h-9 px-3.5 text-xs inline-flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
          >
            <Plus size={14} /> Add Bank Account
          </button>
        </div>

        <div className="mt-5">
          {!bankAccounts.length ? (
            <div className="rounded-xl border border-dashed border-ink-600 p-8 text-center">
              <Building2 className="mx-auto h-8 w-8 text-bone-500 mb-2" />
              <p className="text-sm text-bone-300">No bank accounts configured yet.</p>
              <button
                type="button"
                onClick={openAddBankModal}
                className="btn btn-primary mt-3 h-8 text-xs cursor-pointer"
              >
                Add first bank account
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bankAccounts.map((acc, idx) => (
                <div
                  key={acc.id || idx}
                  className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                    acc.is_active
                      ? "border-ink-600 bg-ink-800/40 hover:border-ink-500"
                      : "border-ink-700 bg-ink-900/40 opacity-70"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-bone-50 truncate" title={acc.name}>
                          {acc.name}
                        </h4>
                        <p className="text-xs text-bone-400 truncate">{acc.bank_name}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                        <span className="mono-tag rounded bg-lime-400/10 border border-lime-400/30 px-1.5 py-0.5 text-[10px] text-lime-400 font-semibold">
                          {acc.currency}
                        </span>
                        {acc.is_default && (
                          <span className="mono-tag rounded bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 text-[10px] text-amber-300 flex items-center gap-1">
                            <Star size={9} className="fill-amber-300 text-amber-300" /> Default
                          </span>
                        )}
                        {!acc.is_active && (
                          <span className="mono-tag rounded bg-ink-700 px-1.5 py-0.5 text-[10px] text-bone-400 flex items-center gap-1">
                            <EyeOff size={9} /> Hidden
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-bone-300 border-t border-ink-700/60 pt-2.5">
                      <div className="flex justify-between gap-2">
                        <span className="text-bone-400 text-[11px] shrink-0">Title:</span>
                        <span className="font-mono text-bone-100 font-medium text-right truncate" title={acc.beneficiary}>
                          {acc.beneficiary}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-bone-400 text-[11px] shrink-0">Account / IBAN:</span>
                        <span className="font-mono text-bone-100 font-medium text-right truncate" title={acc.iban || acc.account_number}>
                          {acc.iban || acc.account_number}
                        </span>
                      </div>
                      {acc.swift && (
                        <div className="flex justify-between gap-2">
                          <span className="text-bone-400 text-[11px] shrink-0">SWIFT / BIC:</span>
                          <span className="font-mono text-bone-100 text-right">{acc.swift}</span>
                        </div>
                      )}
                      {acc.routing_number && (
                        <div className="flex justify-between gap-2">
                          <span className="text-bone-400 text-[11px] shrink-0">Routing / Sort:</span>
                          <span className="font-mono text-bone-100 text-right">{acc.routing_number}</span>
                        </div>
                      )}
                      {acc.instructions && (
                        <p className="text-[11px] text-bone-400 italic pt-1 border-t border-ink-700/40 line-clamp-2" title={acc.instructions}>
                          &ldquo;{acc.instructions}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-ink-700/60 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleBankActive(idx)}
                        className={`mono-tag inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                          acc.is_active
                            ? "text-bone-300 hover:text-amber-300 bg-ink-700/40 hover:bg-ink-700"
                            : "text-lime-400 hover:text-lime-300 bg-lime-400/10 hover:bg-lime-400/20"
                        }`}
                        title={acc.is_active ? "Hide from clients" : "Make visible to clients"}
                      >
                        {acc.is_active ? (
                          <>
                            <EyeOff size={11} /> Hide
                          </>
                        ) : (
                          <>
                            <Eye size={11} /> Unhide
                          </>
                        )}
                      </button>

                      {!acc.is_default && acc.is_active && (
                        <button
                          type="button"
                          onClick={() => setBankDefault(idx)}
                          className="mono-tag text-[11px] text-bone-400 hover:text-amber-300 transition-colors cursor-pointer"
                          title="Set as primary default account"
                        >
                          Make default
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditBankModal(idx)}
                        className="p-1 rounded text-bone-300 hover:text-lime-400 hover:bg-ink-700 transition-colors cursor-pointer"
                        title="Edit account details"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBankAccount(idx)}
                        className="p-1 rounded text-bone-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete account"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Add / Edit Bank Account Modal */}
      <Modal
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        title={editingBankIndex !== null ? "Edit Bank Account" : "Add Bank Account"}
        eyebrow="Payment Channel"
        description="Enter the bank wire or electronic payment details clients will see on invoices."
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="mono-tag rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-bone-300 hover:text-bone-100 cursor-pointer"
              onClick={() => setBankModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary h-8 px-4 text-xs cursor-pointer"
              onClick={handleSaveBankForm}
            >
              {editingBankIndex !== null ? "Update Account" : "Add Account"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Account Display Name *</label>
              <input
                className={field}
                placeholder="e.g. USD International Wire (Wise)"
                value={bankForm.name}
                onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>Currency</label>
              <CustomSelect
                value={bankForm.currency}
                onChange={(val) => setBankForm({ ...bankForm, currency: val })}
                options={[
                  ...CURRENCIES.map((c) => ({ value: c, label: c })),
                  { value: "ALL", label: "ALL (Multi-currency)" },
                ]}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Beneficiary / Account Title *</label>
              <input
                className={field}
                placeholder="e.g. Nex Desk LLC"
                value={bankForm.beneficiary}
                onChange={(e) => setBankForm({ ...bankForm, beneficiary: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>Bank Name *</label>
              <input
                className={field}
                placeholder="e.g. Wise / Community Federal Savings Bank"
                value={bankForm.bank_name}
                onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Account Number *</label>
              <input
                className={field}
                placeholder="e.g. 9876543210"
                value={bankForm.account_number}
                onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>IBAN (if applicable)</label>
              <input
                className={field}
                placeholder="e.g. GB00WISE00000012345678"
                value={bankForm.iban ?? ""}
                onChange={(e) => setBankForm({ ...bankForm, iban: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={label}>SWIFT / BIC Code</label>
              <input
                className={field}
                placeholder="e.g. CMFGUS33"
                value={bankForm.swift ?? ""}
                onChange={(e) => setBankForm({ ...bankForm, swift: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>Routing # / Sort Code</label>
              <input
                className={field}
                placeholder="e.g. 026073150"
                value={bankForm.routing_number ?? ""}
                onChange={(e) => setBankForm({ ...bankForm, routing_number: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>Branch / Country</label>
              <input
                className={field}
                placeholder="e.g. New York, USA"
                value={bankForm.branch ?? ""}
                onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className={label}>Payment Instructions / Reference Notes</label>
            <textarea
              rows={2}
              className={`${field} resize-none`}
              placeholder="e.g. Wire transfer in USD. Please include invoice number in the payment memo."
              value={bankForm.instructions ?? ""}
              onChange={(e) => setBankForm({ ...bankForm, instructions: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-ink-700">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-bone-200">
              <input
                type="checkbox"
                checked={bankForm.is_active}
                onChange={(e) => setBankForm({ ...bankForm, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-ink-500 bg-ink-800 text-lime-400 focus:ring-lime-400"
              />
              <span>Visible to clients on invoices (Active)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-bone-200">
              <input
                type="checkbox"
                checked={bankForm.is_default}
                onChange={(e) => setBankForm({ ...bankForm, is_default: e.target.checked })}
                className="h-4 w-4 rounded border-ink-500 bg-ink-800 text-lime-400 focus:ring-lime-400"
              />
              <span>Set as primary default account</span>
            </label>
          </div>
        </div>
      </Modal>

      <section className="card p-6 xl:col-span-2">
        <h2 className="mb-2 text-base">Default terms and conditions</h2>
        <p className="mb-4 text-xs text-bone-400">
          Loaded into every new deal. You can still edit them per deal without changing this.
        </p>
        <textarea className={`${field} min-h-64 resize-none font-mono text-xs leading-relaxed`}
          value={f.default_terms} onChange={(e) => set("default_terms", e.target.value)} />

        <div className="mt-6 border-t border-ink-600 pt-5">
          <label className={label}>Cancellation and refund policy</label>
          <p className="mb-2 mt-1 text-xs leading-relaxed text-bone-400">
            Printed in every agreement, so it is agreed up front rather than argued afterwards.
            The Cancel-project panel works to these rules.
          </p>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Booking fee (%)</label>
              <input className={field} type="number" min={0} max={100}
                value={f.booking_fee_pct}
                onChange={(e) => set("booking_fee_pct", Number(e.target.value))} />
              <p className="mt-1 text-[11px] leading-relaxed text-bone-400">
                The least you keep on a cancellation, charged on what the client actually paid.
                Only applies when it is more than the work delivered. 0 turns it off.
              </p>
            </div>
            <div>
              <label className={label}>Grace window (hours)</label>
              <input className={field} type="number" min={0} max={336}
                value={f.refund_grace_hours}
                onChange={(e) => set("refund_grace_hours", Number(e.target.value))} />
              <p className="mt-1 text-[11px] leading-relaxed text-bone-400">
                Cancel within this long of the first payment, before work starts, and the
                booking fee is waived entirely.
              </p>
            </div>
          </div>

          <textarea className={`${field} min-h-40 resize-none font-mono text-xs leading-relaxed`}
            value={f.refund_policy} onChange={(e) => set("refund_policy", e.target.value)} />
          <p className="mt-2 text-[11px] leading-relaxed text-bone-400">
            Changing these does not alter agreements already signed — each PDF carries the
            wording that was in force when it was generated.
          </p>
        </div>

        <div className="mt-4">
          <label className={label}>Email signature</label>
          <textarea className={`${field} min-h-24 resize-none`} value={f.email_signature}
            onChange={(e) => set("email_signature", e.target.value)} />
        </div>
      </section>

      <section className="card p-6 xl:col-span-2">
        <h2 className="mb-2 text-base">Team</h2>
        <p className="mb-4 text-xs text-bone-400">
          Add staff in Supabase under Authentication → Users, then set their role with{" "}
          <span className="font-mono">update profiles set role = &apos;staff&apos; where email = &apos;…&apos;</span>.
          There is deliberately no signup form.
        </p>
        <div className="divide-y divide-ink-600">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p>{s.full_name ?? s.email}</p>
                <p className="text-xs text-bone-400">{s.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{s.role}</Badge>
                {!s.is_active && <Badge>inactive</Badge>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="xl:col-span-2">
        <button className="btn btn-primary" onClick={() => save()} disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center justify-between gap-4 rounded-xl border border-lime-400/40 bg-ink-900/95 px-5 py-3 shadow-2xl backdrop-blur sm:min-w-[440px]">
          <span className="flex items-center gap-2 text-xs font-medium text-bone-100">
            <AlertCircle size={15} className="shrink-0 text-lime-400" />
            Unsaved changes in Settings
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="mono-tag rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-bone-300 hover:border-ink-400 hover:text-bone-100"
              onClick={() => {
                const init = JSON.parse(initialState);
                setF(init.f);
                setWorkDays(init.workDays);
                setBankAccounts(init.bankAccounts);
              }}
            >
              Discard
            </button>
            <button
              type="button"
              className="btn btn-primary h-8 px-3 text-xs"
              onClick={() => save()}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
