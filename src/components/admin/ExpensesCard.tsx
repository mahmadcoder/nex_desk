"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Receipt, Plus, Trash2, ExternalLink, FileText, AlertTriangle,
  CalendarClock, Pencil, EyeOff,
} from "lucide-react";
import Modal from "@/components/admin/Modal";
import ConfirmModal from "@/components/admin/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";
import ReceiptUpload from "@/components/admin/ReceiptUpload";
import { saveExpense, deleteExpense, billExpenses } from "@/lib/actions/expenses";
import { EXPENSE_CATEGORIES, expenseCategory } from "@/config/expenseCategories";
import { money, daysUntil } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none transition-colors";

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "PKR", label: "PKR (Rs)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "AED", label: "AED (د.إ)" },
];

const today = () => new Date().toISOString().slice(0, 10);
const yearFromNow = () =>
  new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);

function blank(currency: string, projectId: string | null) {
  return {
    id: null as string | null,
    clientId: "",
    projectId,
    category: "domain",
    label: "",
    vendor: "",
    details: "",
    cost: "",
    billAmount: "",
    currency,
    incurredOn: today(),
    renewsOn: yearFromNow(),
    receiptUrl: "",
    visibleToClient: true,
    notifyClient: true,
  };
}

/**
 * Costs paid on the client's behalf — domains, hosting, licences, ad spend.
 *
 * Two numbers, not one: what it cost the agency, and what the client is
 * charged. Equal for a straight pass-through, higher with a handling margin,
 * and zero when it is absorbed — which is a decision worth recording rather
 * than a number quietly missing from the books.
 */
export default function ExpensesCard({
  clientId,
  clientName,
  projectId = null,
  defaultCurrency = "USD",
  expenses,
}: {
  clientId: string;
  clientName: string;
  projectId?: string | null;
  defaultCurrency?: string;
  expenses: any[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => blank(defaultCurrency, projectId));
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const cat = expenseCategory(form.category);

  const unbilled = useMemo(
    () => expenses.filter((e) => e.status === "unbilled" && Number(e.bill_amount) > 0),
    [expenses]
  );

  // Only one currency can go on one invoice, so the button follows whatever
  // the first ticked row is in and the rest are locked out of selection.
  const selectionCurrency = useMemo(() => {
    const first = expenses.find((e) => e.id === selected[0]);
    return first ? String(first.currency).toUpperCase() : null;
  }, [selected, expenses]);

  const selectedTotal = useMemo(
    () =>
      expenses
        .filter((e) => selected.includes(e.id))
        .reduce((s, e) => s + Number(e.bill_amount || 0), 0),
    [selected, expenses]
  );

  function openNew() {
    setForm({ ...blank(defaultCurrency, projectId), clientId });
    setOpen(true);
  }

  function openEdit(e: any) {
    setForm({
      id: e.id,
      clientId,
      projectId: e.project_id ?? projectId,
      category: e.category ?? "other",
      label: e.label ?? "",
      vendor: e.vendor ?? "",
      details: e.details ?? "",
      cost: String(e.cost ?? ""),
      billAmount: String(e.bill_amount ?? ""),
      currency: String(e.currency ?? defaultCurrency).toUpperCase(),
      incurredOn: e.incurred_on ?? today(),
      renewsOn: e.renews_on ?? "",
      receiptUrl: e.receipt_url ?? "",
      visibleToClient: e.visible_to_client ?? true,
      notifyClient: false,
    });
    setOpen(true);
  }

  /** Picking a category re-suggests a renewal date only for things that recur. */
  function pickCategory(value: string) {
    const next = expenseCategory(value);
    setForm((f) => ({
      ...f,
      category: value,
      renewsOn: next.recurs ? f.renewsOn || yearFromNow() : "",
    }));
  }

  function submit() {
    if (!form.label.trim()) {
      toast.error(
        form.category === "other"
          ? "Describe what this was."
          : "Name the item — the domain, the tool, whichever it is."
      );
      return;
    }

    start(async () => {
      const res = await saveExpense({
        id: form.id,
        clientId,
        projectId: form.projectId,
        category: form.category,
        label: form.label,
        vendor: form.vendor,
        details: form.details,
        cost: Number(form.cost || 0),
        billAmount: Number(form.billAmount || 0),
        currency: form.currency,
        incurredOn: form.incurredOn,
        renewsOn: form.renewsOn || null,
        receiptUrl: form.receiptUrl,
        visibleToClient: form.visibleToClient,
        notifyClient: form.notifyClient,
      });

      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        form.id
          ? "Expense updated."
          : form.notifyClient && form.visibleToClient
            ? `Recorded — ${clientName} has been emailed a copy.`
            : "Recorded."
      );
      setOpen(false);
      router.refresh();
    });
  }

  function remove(e: any) {
    start(async () => {
      const res = await deleteExpense(e.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Removed.");
      setConfirmDelete(null);
      router.refresh();
    });
  }

  function bill() {
    start(async () => {
      const res = await billExpenses(clientId, selected);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Invoice ${res.invoiceNo} raised for ${res.count} item${res.count === 1 ? "" : "s"}.`
      );
      setSelected([]);
      router.refresh();
    });
  }

  return (
    <details className="card group space-y-3 border-ink-600 p-5">
      <summary className="flex cursor-pointer items-center justify-between gap-3 border-b border-ink-700 pb-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <h2 className="flex items-center gap-2 text-base font-semibold text-bone-50">
          <Receipt size={16} className="text-lime-400" /> Paid on their behalf
          {!!expenses.length && <span className="mono-tag text-[11px]">{expenses.length}</span>}
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            /* Inside a <summary>, a click's default action is toggling the
               panel. Cancelling it keeps Add as Add rather than Add-and-close. */
            onClick={(ev) => {
              ev.preventDefault();
              openNew();
            }}
            className="btn btn-sm gap-1.5"
          >
            <Plus size={13} /> Add
          </button>
          <span className="mono-tag shrink-0 text-bone-300 group-open:hidden">+</span>
          <span className="mono-tag hidden shrink-0 text-bone-300 group-open:inline">−</span>
        </div>
      </summary>

      {!expenses.length ? (
        <p className="text-xs leading-relaxed text-bone-300">
          Domains, hosting, plugin licences, ad spend — anything bought for this client
          outside the agreed fee. Record it with the receipt and they are emailed a copy,
          so the first they hear of a charge is never the invoice.
        </p>
      ) : (
        <ul className="divide-y divide-ink-700">
          {expenses.map((e) => {
            const days = daysUntil(e.renews_on);
            const info = expenseCategory(e.category);
            const isUnbilled = e.status === "unbilled" && Number(e.bill_amount) > 0;
            const lockedOut =
              !!selectionCurrency &&
              String(e.currency).toUpperCase() !== selectionCurrency;

            return (
              <li key={e.id} className="flex items-start gap-3 py-3">
                {isUnbilled && (
                  <input
                    type="checkbox"
                    className="mt-1 h-3.5 w-3.5 shrink-0 accent-lime-400 disabled:opacity-30"
                    checked={selected.includes(e.id)}
                    disabled={lockedOut}
                    title={
                      lockedOut
                        ? `An invoice carries one currency. Clear the ${selectionCurrency} selection first.`
                        : "Include on the next invoice"
                    }
                    onChange={(ev) =>
                      setSelected((s) =>
                        ev.target.checked ? [...s, e.id] : s.filter((x) => x !== e.id)
                      )
                    }
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="mono-tag text-[10px] text-lime-300">{info.label}</span>
                    {e.status === "invoiced" && (
                      <span className="mono-tag rounded-full border border-ink-500 px-1.5 py-0.5 text-[9px] leading-none text-bone-300">
                        invoiced
                      </span>
                    )}
                    {e.status === "absorbed" && (
                      <span className="mono-tag rounded-full border border-sky-400/40 bg-sky-400/10 px-1.5 py-0.5 text-[9px] leading-none text-sky-300">
                        we covered it
                      </span>
                    )}
                    {!e.visible_to_client && (
                      <span
                        className="inline-flex items-center gap-1 text-[9px] text-bone-400"
                        title="Hidden from the client portal"
                      >
                        <EyeOff size={10} /> internal
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 truncate text-sm text-bone-100">{e.label}</p>

                  <p className="mt-0.5 text-[11px] text-bone-400">
                    {e.vendor ? `${e.vendor} · ` : ""}
                    {e.incurred_on}
                    {Number(e.cost) !== Number(e.bill_amount) && (
                      <> · cost {money(Number(e.cost), e.currency)}</>
                    )}
                  </p>

                  {days !== null && (
                    <p
                      className={`mt-1 inline-flex items-center gap-1 text-[11px] ${
                        days < 0
                          ? "text-rose-300"
                          : days <= 30
                            ? "text-amber-300"
                            : "text-bone-400"
                      }`}
                    >
                      {days <= 30 ? <AlertTriangle size={11} /> : <CalendarClock size={11} />}
                      {days < 0
                        ? `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`
                        : `Renews in ${days} day${days === 1 ? "" : "s"} — ${e.renews_on}`}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-mono text-xs text-bone-100">
                    {money(Number(e.bill_amount), e.currency)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {e.receipt_url && (
                      <a
                        href={e.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open receipt"
                        className="text-bone-400 hover:text-lime-400"
                      >
                        <FileText size={13} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(e)}
                      title="Edit"
                      className="text-bone-400 hover:text-lime-400"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(e)}
                      title="Remove"
                      className="text-bone-400 hover:text-rose-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-lime-400/25 bg-lime-400/[0.06] p-3">
          <p className="text-xs text-bone-200">
            {selected.length} item{selected.length === 1 ? "" : "s"} ·{" "}
            <strong className="font-mono">
              {money(selectedTotal, selectionCurrency ?? defaultCurrency)}
            </strong>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelected([])} className="btn btn-sm">
              Clear
            </button>
            <button
              type="button"
              onClick={bill}
              disabled={pending}
              className="btn btn-primary btn-sm"
            >
              {pending ? "Raising…" : "Bill on one invoice"}
            </button>
          </div>
        </div>
      )}

      {!selected.length && unbilled.length > 0 && (
        <p className="text-[11px] text-bone-400">
          {unbilled.length} item{unbilled.length === 1 ? "" : "s"} not yet billed. Tick to put
          them on one invoice.
        </p>
      )}

      {/* ── Add / edit ───────────────────────────────────────── */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        size="lg"
        eyebrow={clientName}
        title={form.id ? "Edit this cost" : "Cost paid on their behalf"}
        description="What you bought for them outside the agreed fee. They get the receipt and the figure by email."
        footer={
          <>
            <button type="button" className="btn" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={pending}>
              {pending ? "Saving…" : form.id ? "Save changes" : "Record it"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <CustomSelect
              label="What kind of cost"
              options={EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              value={form.category}
              onChange={pickCategory}
            />
            <p className="mt-1 text-[11px] text-bone-400">{cat.hint}</p>
          </div>

          <div>
            <label className="mono-tag mb-1.5 block text-xs">
              {form.category === "other" ? "What was it *" : "Which one *"}
            </label>
            <input
              className={field}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder={
                form.category === "domain"
                  ? "physicianmeds.com — 1 year"
                  : form.category === "other"
                    ? "Describe it in your own words"
                    : "Name of the tool, licence or service"
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mono-tag mb-1.5 block text-xs">Bought from</label>
              <input
                className={field}
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                placeholder="Namecheap, Hostinger, Figma…"
              />
            </div>
            <div>
              <CustomSelect
                label="Currency"
                options={CURRENCY_OPTIONS}
                value={form.currency}
                onChange={(v) => setForm({ ...form, currency: v })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mono-tag mb-1.5 block text-xs">What it cost you *</label>
              <input
                className={field}
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cost: e.target.value,
                    // Straight pass-through is the common case, so the charge
                    // follows the cost until it is edited by hand.
                    billAmount: f.billAmount === f.cost ? e.target.value : f.billAmount,
                  }))
                }
                placeholder="0.00"
              />
              <p className="mt-1 text-[11px] text-bone-400">What left your account.</p>
            </div>
            <div>
              <label className="mono-tag mb-1.5 block text-xs">What they pay *</label>
              <input
                className={field}
                type="number"
                min="0"
                step="0.01"
                value={form.billAmount}
                onChange={(e) => setForm({ ...form, billAmount: e.target.value })}
                placeholder="0.00"
              />
              <p className="mt-1 text-[11px] text-bone-400">
                Zero means you are covering it — recorded as a gesture, not billed.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mono-tag mb-1.5 block text-xs">Bought on</label>
              <input
                className={field}
                type="date"
                value={form.incurredOn}
                onChange={(e) => setForm({ ...form, incurredOn: e.target.value })}
              />
            </div>
            <div>
              <label className="mono-tag mb-1.5 block text-xs">Renews on</label>
              <input
                className={field}
                type="date"
                value={form.renewsOn}
                onChange={(e) => setForm({ ...form, renewsOn: e.target.value })}
              />
              <p className="mt-1 text-[11px] text-bone-400">
                {cat.critical
                  ? "Set this — you and the client are warned 30, 14 and 3 days before it lapses."
                  : "Optional. Leave empty for a one-off."}
              </p>
            </div>
          </div>

          <div>
            <label className="mono-tag mb-1.5 block text-xs">Notes (optional)</label>
            <textarea
              className={`${field} min-h-[70px] resize-y`}
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              placeholder="Anything the client should know — which account it sits under, what it covers."
            />
          </div>

          <ReceiptUpload
            initialUrl={form.receiptUrl}
            onUploaded={(url) => setForm((f) => ({ ...f, receiptUrl: url }))}
          />

          <div className="space-y-2 rounded-lg border border-ink-600 bg-ink-800/50 p-3">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 accent-lime-400"
                checked={form.visibleToClient}
                onChange={(e) => setForm({ ...form, visibleToClient: e.target.checked })}
              />
              <span className="text-xs leading-relaxed text-bone-200">
                Show in their portal
                <span className="block text-[11px] text-bone-400">
                  They can open the receipt themselves instead of asking for it.
                </span>
              </span>
            </label>

            {!form.id && (
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-3.5 w-3.5 accent-lime-400"
                  checked={form.notifyClient}
                  disabled={!form.visibleToClient}
                  onChange={(e) => setForm({ ...form, notifyClient: e.target.checked })}
                />
                <span className="text-xs leading-relaxed text-bone-200">
                  Email {clientName} now
                  <span className="block text-[11px] text-bone-400">
                    The item, the figure and the receipt link. Off for a quiet correction.
                  </span>
                </span>
              </label>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        pending={pending}
        isDanger
        title="Remove this cost?"
        confirmText="Remove"
        description={
          confirmDelete
            ? `"${confirmDelete.label}" disappears from the client's portal and from the profit figures. This cannot be undone.`
            : ""
        }
        onConfirm={() => confirmDelete && remove(confirmDelete)}
      />
    </details>
  );
}
