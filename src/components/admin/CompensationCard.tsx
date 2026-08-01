"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TrendingUp, Gift, Award, Trash2 } from "lucide-react";
import { recordCompensation, deleteCompensation } from "@/lib/actions/staff";
import { money, CURRENCIES } from "@/lib/utils";
import Modal from "@/components/admin/Modal";
import ConfirmModal from "@/components/admin/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm focus:border-lime-400 focus:outline-none";

const KINDS = {
  salary_revision: {
    label: "Salary revision",
    icon: TrendingUp,
    blurb:
      "Changes what they earn from here on, and reissues their offer letter stating the new figure.",
    emails: "They are emailed with the new letter attached.",
  },
  bonus: {
    label: "Bonus",
    icon: Award,
    blurb: "A one-off payment on top of salary. Add it to the next payroll run yourself.",
    emails: "They and you are both emailed.",
  },
  gift: {
    label: "Gift",
    icon: Gift,
    blurb: "Recorded for your books only — Eid, a wedding, a thank-you.",
    emails: "No email is sent. Announcing a gift makes it a transaction.",
  },
} as const;

type Kind = keyof typeof KINDS;

/**
 * Pay history for one employee.
 *
 * `employees.salary_amount` held a single number with no history, so a raise
 * erased the record of what someone used to be on, and bonuses and gifts had
 * nowhere to live at all.
 */
export default function CompensationCard({
  employee,
  history,
}: {
  employee: any;
  history: any[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<Kind | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [form, setForm] = useState({
    amount: "",
    currency: employee.salary_currency || "USD",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    reason: "",
  });

  const open = (k: Kind) => {
    setForm({
      amount: k === "salary_revision" ? String(employee.salary_amount ?? "") : "",
      currency: employee.salary_currency || "USD",
      effectiveFrom: new Date().toISOString().slice(0, 10),
      reason: "",
    });
    setKind(k);
  };

  const save = () => {
    if (!kind) return;
    if (!(Number(form.amount) > 0)) return toast.error("Enter an amount greater than zero.");

    start(async () => {
      try {
        const res = await recordCompensation({
          employeeId: employee.id,
          kind,
          amount: Number(form.amount),
          currency: form.currency,
          effectiveFrom: form.effectiveFrom,
          reason: form.reason,
        });

        if (kind === "gift") toast.success("Gift recorded. No email sent, as intended.");
        else if (res.emailed)
          toast.success(
            kind === "salary_revision"
              ? res.offerReissued
                ? "Salary updated and a new offer letter sent."
                : "Salary updated and emailed, but the letter could not be rebuilt."
              : "Bonus recorded and everyone emailed."
          );
        else toast.warning("Recorded, but the email did not send.");

        setKind(null);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "Could not record that.");
      }
    });
  };

  const active = kind ? KINDS[kind] : null;

  return (
    <section className="card space-y-4 border-ink-600 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-bone-50">
          <TrendingUp size={16} className="text-lime-400" /> Pay
        </h2>
        <span className="font-mono text-sm text-bone-50">
          {Number(employee.salary_amount) > 0
            ? `${money(Number(employee.salary_amount), employee.salary_currency)} / month`
            : "No salary set"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(KINDS) as Kind[]).map((k) => {
          const Icon = KINDS[k].icon;
          return (
            <button key={k} className="btn h-9 px-3.5 text-sm" onClick={() => open(k)}>
              <Icon className="mr-1.5 h-3.5 w-3.5" /> {KINDS[k].label}
            </button>
          );
        })}
      </div>

      {history.length === 0 ? (
        <p className="text-xs leading-relaxed text-bone-300">
          Nothing recorded yet. Raises, bonuses and gifts all land here so you have one
          honest history of what this person has been paid.
        </p>
      ) : (
        <ul className="divide-y divide-ink-700 rounded-lg border border-ink-700">
          {history.map((h) => {
            const Icon = KINDS[h.kind as Kind]?.icon ?? Award;
            return (
              <li key={h.id} className="flex flex-wrap items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm text-bone-100">
                    <Icon size={13} className="shrink-0 text-lime-400" />
                    <span className="font-mono">{money(Number(h.amount), h.currency)}</span>
                    <span className="text-bone-300">
                      {KINDS[h.kind as Kind]?.label ?? h.kind}
                    </span>
                  </p>
                  {h.kind === "salary_revision" && h.previous_amount !== null && (
                    <p className="mono-tag mt-0.5 text-[11px]">
                      was {money(Number(h.previous_amount), h.currency)}
                    </p>
                  )}
                  {h.reason && (
                    <p className="mt-1 text-xs leading-relaxed text-bone-300">{h.reason}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="mono-tag text-[11px]">
                    {new Date(h.effective_from).toLocaleDateString("en-GB")}
                  </span>
                  <button
                    className="rounded p-1.5 text-bone-400 transition-colors hover:bg-ink-800 hover:text-rose-400"
                    onClick={() => setDeleting(h)}
                    title="Remove this record"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={!!kind}
        onClose={() => setKind(null)}
        pending={pending}
        title={active?.label ?? ""}
        eyebrow={employee.full_name}
        description={active?.blurb}
        footer={
          <>
            <button className="btn h-10" onClick={() => setKind(null)} disabled={pending}>
              Cancel
            </button>
            <button className="btn btn-primary h-10" onClick={save} disabled={pending}>
              {pending ? "Saving…" : active?.label}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mono-tag mb-1.5 block">
                {kind === "salary_revision" ? "New monthly salary" : "Amount"}
              </label>
              <input
                className={field}
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="mono-tag mb-1.5 block">Currency</label>
              <CustomSelect
                value={form.currency}
                onChange={(v) => setForm({ ...form, currency: v })}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
          </div>

          <div>
            <label className="mono-tag mb-1.5 block">Effective from</label>
            <input
              className={field}
              type="date"
              value={form.effectiveFrom}
              onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
            />
          </div>

          <div>
            <label className="mono-tag mb-1.5 block">
              {kind === "gift" ? "What for (your records)" : "Why"}
            </label>
            <textarea
              className={`${field} min-h-24 resize-y`}
              value={form.reason}
              placeholder={
                kind === "salary_revision"
                  ? "Six-month review — consistently shipping ahead of deadline."
                  : kind === "bonus"
                    ? "Rescued the Zenith launch after the payment gateway broke."
                    : "Eid gift."
              }
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
            {kind !== "gift" && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-bone-300">
                This goes in the email. Specific beats generous-sounding — people remember
                being told exactly what they did well.
              </p>
            )}
          </div>

          <p className="rounded-lg border border-ink-600 bg-ink-900/60 p-3 text-[11px] leading-relaxed text-bone-300">
            {active?.emails}
          </p>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          start(async () => {
            try {
              await deleteCompensation(deleting.id);
              toast.success(
                deleting.kind === "salary_revision"
                  ? "Removed, and the previous salary restored."
                  : "Removed."
              );
              setDeleting(null);
              router.refresh();
            } catch (e: any) {
              toast.error(e?.message || "Could not remove that.");
            }
          })
        }
        pending={pending}
        title="Remove this record?"
        confirmText="Remove"
        description={
          deleting?.kind === "salary_revision"
            ? "The employee's salary reverts to what it was before this revision. No email is sent either way."
            : "The record is deleted. No email is sent — anyone already told stays told."
        }
      />
    </section>
  );
}
