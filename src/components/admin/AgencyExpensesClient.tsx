"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Wallet, Plus, Trash2, Pencil, FileText, CalendarClock, AlertTriangle, Search,
} from "lucide-react";
import { PageHead, Stat, Empty } from "@/components/admin/ui";
import Modal from "@/components/admin/Modal";
import ConfirmModal from "@/components/admin/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";
import ReceiptUpload from "@/components/admin/ReceiptUpload";
import { money, moneyMulti, sumByCurrency, daysUntil, CURRENCIES, cn } from "@/lib/utils";
import {
  AGENCY_EXPENSE_CATEGORIES, agencyCategory, agencyCategoryLabel,
} from "@/config/agencyExpenseCategories";
import { saveAgencyExpense, deleteAgencyExpense } from "@/lib/actions/agencyExpenses";
import { fmtMonth } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none";

const today = () => new Date().toISOString().slice(0, 10);
const monthOut = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};

const blank = () => ({
  id: null as string | null,
  category: "software",
  vendor: "",
  label: "",
  amount: "",
  currency: "USD",
  incurredOn: today(),
  isRecurring: true,
  renewsOn: monthOut(1),
  receiptUrl: "",
  notes: "",
});

/**
 * What the agency spends on itself.
 *
 * A client component because the whole page is a form plus a filtered list —
 * filtering here is instant and the list is small.
 */
export default function AgencyExpensesClient({ expenses }: { expenses: any[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const cat = agencyCategory(f.category);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((x) => {
      if (category !== "all" && x.category !== category) return false;
      if (!q) return true;
      return [x.label, x.vendor, x.notes, agencyCategoryLabel(x.category)]
        .some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [expenses, category, query]);

  const thisMonth = expenses.filter(
    (x) => String(x.incurred_on).slice(0, 7) === new Date().toISOString().slice(0, 7)
  );
  const monthTotal = sumByCurrency(thisMonth, (x: any) => x.currency, (x: any) => Number(x.amount));
  const recurring = expenses.filter((x) => x.is_recurring);
  const recurringTotal = sumByCurrency(recurring, (x: any) => x.currency, (x: any) => Number(x.amount));

  const dueSoon = expenses
    .filter((x) => {
      const d = daysUntil(x.renews_on);
      return d !== null && d >= 0 && d <= 30;
    })
    .sort((a, b) => (a.renews_on < b.renews_on ? -1 : 1));

  // Grouped by month so a year of subscriptions reads as months, not a wall.
  const byMonth = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const x of rows) {
      const key = String(x.incurred_on).slice(0, 7);
      m.set(key, [...(m.get(key) ?? []), x]);
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows]);

  function openNew() {
    setF(blank());
    setOpen(true);
  }

  function openEdit(x: any) {
    setF({
      id: x.id,
      category: x.category ?? "other",
      vendor: x.vendor ?? "",
      label: x.label ?? "",
      amount: String(x.amount ?? ""),
      currency: String(x.currency ?? "USD").toUpperCase(),
      incurredOn: x.incurred_on ?? today(),
      isRecurring: !!x.is_recurring,
      renewsOn: x.renews_on ?? "",
      receiptUrl: x.receipt_url ?? "",
      notes: x.notes ?? "",
    });
    setOpen(true);
  }

  function pickCategory(value: string) {
    const next = agencyCategory(value);
    setF((p) => ({
      ...p,
      category: value,
      isRecurring: next.recurs,
      renewsOn: next.recurs ? p.renewsOn || monthOut(1) : "",
    }));
  }

  function submit() {
    if (!f.label.trim()) {
      toast.error("Name it — the tool, the bill, whatever it is.");
      return;
    }
    start(async () => {
      const res = await saveAgencyExpense({
        id: f.id,
        category: f.category,
        vendor: f.vendor,
        label: f.label,
        amount: Number(f.amount || 0),
        currency: f.currency,
        incurredOn: f.incurredOn,
        isRecurring: f.isRecurring,
        renewsOn: f.renewsOn || null,
        receiptUrl: f.receiptUrl,
        notes: f.notes,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(f.id ? "Updated." : "Recorded.");
      setOpen(false);
      router.refresh();
    });
  }

  function remove(x: any) {
    start(async () => {
      const res = await deleteAgencyExpense(x.id);
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
    <>
      <PageHead
        title="Agency Expenses"
        sub="What you spend on yourselves — tools, subscriptions, hardware, office."
        action={
          <button onClick={openNew} className="btn btn-primary h-10 gap-1.5">
            <Plus size={14} /> Add expense
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="This month" value={moneyMulti(monthTotal, "—")} hint={`${thisMonth.length} recorded`} />
        <Stat
          label="Recurring"
          value={moneyMulti(recurringTotal, "—")}
          hint={`${recurring.length} subscription${recurring.length === 1 ? "" : "s"} on file`}
        />
        <Stat
          label="Renewing in 30 days"
          value={String(dueSoon.length)}
          tone={dueSoon.length ? "warn" : "default"}
          hint={dueSoon.length ? dueSoon[0].label : "Nothing due"}
        />
      </div>

      {!!dueSoon.length && (
        <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] p-3.5">
          <CalendarClock size={15} className="mt-0.5 shrink-0 text-amber-400" />
          <div className="text-xs leading-relaxed text-amber-200">
            <p className="font-semibold">Renewing soon</p>
            {dueSoon.slice(0, 4).map((x) => (
              <p key={x.id}>
                {x.label} — {money(Number(x.amount), x.currency)} on {x.renews_on} (
                {daysUntil(x.renews_on)} days)
              </p>
            ))}
            <p className="mt-1 text-amber-200/70">
              You are reminded by email 30, 14 and 3 days before each one.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      {!!expenses.length && (
        <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[{ value: "all", label: "All" }, ...AGENCY_EXPENSE_CATEGORIES].map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={cn(
                  "mono-tag rounded-full border px-3 py-1.5 text-[11px] transition-colors",
                  category === c.value
                    ? "border-lime-400/50 bg-lime-400/10 text-lime-300"
                    : "border-ink-600 text-bone-300 hover:border-ink-400 hover:text-bone-100"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search
              size={14}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bone-500"
            />
            <input
              className={`${field} w-full pl-9 sm:w-56`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools or vendors…"
              aria-label="Search expenses"
            />
          </div>
        </div>
      )}

      {!expenses.length ? (
        <Empty
          title="Nothing recorded yet"
          body="Cursor, Figma, hosting, laptops, the office internet — anything you pay for that is not billed to a client. Recording it is what makes Money In & Out tell the truth."
        />
      ) : !rows.length ? (
        <Empty
          title="Nothing matches"
          body={query ? `No expense matches "${query}" in this view.` : "Nothing in this category yet."}
        />
      ) : (
        <div className="space-y-6">
          {byMonth.map(([month, items]) => {
            const total = sumByCurrency(items, (x: any) => x.currency, (x: any) => Number(x.amount));
            return (
              <section key={month}>
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="mono-tag text-[11px]">
                    {fmtMonth(`${month}-01T00:00:00`)}
                  </p>
                  <p className="font-mono text-xs text-bone-100">{moneyMulti(total)}</p>
                </div>
                <ul className="card divide-y divide-ink-700 overflow-hidden">
                  {items.map((x) => {
                    const d = daysUntil(x.renews_on);
                    return (
                      <li key={x.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="mono-tag text-[10px] text-lime-300">
                            {agencyCategoryLabel(x.category)}
                          </p>
                          <p className="mt-0.5 text-sm text-bone-100">{x.label}</p>
                          <p className="mt-0.5 text-[11px] text-bone-400">
                            {x.vendor ? `${x.vendor} · ` : ""}
                            {x.incurred_on}
                            {x.is_recurring && x.renews_on && (
                              <span className={d !== null && d <= 30 ? " text-amber-300" : ""}>
                                {" "}· renews {x.renews_on}
                              </span>
                            )}
                          </p>
                          {x.notes && (
                            <p className="mt-1 text-[11px] leading-relaxed text-bone-300">{x.notes}</p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-mono text-xs text-bone-100">
                            {money(Number(x.amount), x.currency)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {x.receipt_url && (
                              <a
                                href={x.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open receipt"
                                className="text-bone-400 hover:text-lime-400"
                              >
                                <FileText size={13} />
                              </a>
                            )}
                            <button
                              onClick={() => openEdit(x)}
                              title="Edit"
                              className="text-bone-400 hover:text-lime-400"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(x)}
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
              </section>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-start gap-2.5 text-[11px] leading-relaxed text-bone-300">
        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-bone-400" />
        <p>
          This is for what you buy for <strong>yourselves</strong>. Anything bought{" "}
          <strong>for a client</strong> — a domain, their plugin licence — belongs on that
          client&rsquo;s page under &ldquo;Paid on their behalf&rdquo;, where it can be re-billed.
        </p>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        size="lg"
        title={f.id ? "Edit this expense" : "Record an agency expense"}
        description="Something you pay for that no client is billed for."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={pending}>
              {pending ? "Saving…" : f.id ? "Save changes" : "Record it"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <CustomSelect
              label="What kind of cost"
              options={AGENCY_EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              value={f.category}
              onChange={pickCategory}
            />
            <p className="mt-1 text-[11px] text-bone-400">{cat.hint}</p>
          </div>

          <div>
            <label className="mono-tag mb-1.5 block text-xs">What is it *</label>
            <input
              className={field}
              value={f.label}
              onChange={(e) => setF({ ...f, label: e.target.value })}
              placeholder="Cursor Pro — 3 seats"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mono-tag mb-1.5 block text-xs">Paid to</label>
              <input
                className={field}
                value={f.vendor}
                onChange={(e) => setF({ ...f, vendor: e.target.value })}
                placeholder="Anysphere, Adobe, K-Electric…"
              />
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
              <label className="mono-tag mb-1.5 block text-xs">Amount *</label>
              <input
                className={field}
                type="number"
                min="0"
                step="0.01"
                value={f.amount}
                onChange={(e) => setF({ ...f, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mono-tag mb-1.5 block text-xs">Paid on</label>
              <input
                className={field}
                type="date"
                value={f.incurredOn}
                onChange={(e) => setF({ ...f, incurredOn: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-ink-600 bg-ink-800/50 p-3">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 accent-lime-400"
                checked={f.isRecurring}
                onChange={(e) =>
                  setF({
                    ...f,
                    isRecurring: e.target.checked,
                    renewsOn: e.target.checked ? f.renewsOn || monthOut(1) : "",
                  })
                }
              />
              <span className="text-xs leading-relaxed text-bone-200">
                This renews automatically
                <span className="block text-[11px] text-bone-400">
                  Subscriptions charge silently. Set the date and you are warned 30, 14 and 3 days
                  before, so renewing is a decision rather than a surprise.
                </span>
              </span>
            </label>

            {f.isRecurring && (
              <div>
                <label className="mono-tag mb-1.5 block text-xs">Next charge</label>
                <input
                  className={field}
                  type="date"
                  value={f.renewsOn}
                  onChange={(e) => setF({ ...f, renewsOn: e.target.value })}
                />
              </div>
            )}
          </div>

          <ReceiptUpload
            initialUrl={f.receiptUrl}
            onUploaded={(url) => setF({ ...f, receiptUrl: url })}
          />

          <div>
            <label className="mono-tag mb-1.5 block text-xs">Notes (optional)</label>
            <textarea
              className={`${field} min-h-[60px] resize-y`}
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
              placeholder="Which account it sits under, who uses it, whether it can be cancelled."
            />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        pending={pending}
        isDanger
        title="Remove this expense?"
        confirmText="Remove"
        description={
          confirmDelete
            ? `"${confirmDelete.label}" disappears from Agency Expenses and from Money In & Out. This cannot be undone.`
            : ""
        }
        onConfirm={() => confirmDelete && remove(confirmDelete)}
      />
    </>
  );
}
