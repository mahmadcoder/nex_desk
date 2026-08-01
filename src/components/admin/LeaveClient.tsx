"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Plus, Check, X } from "lucide-react";
import { requestLeave, decideLeave, cancelLeave } from "@/lib/actions/staff";
import { PageHead } from "@/components/admin/ui";
import Modal from "@/components/admin/Modal";
import ConfirmModal from "@/components/admin/ConfirmModal";
import CustomSelect from "@/components/ui/CustomSelect";
import { Badge } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm focus:border-lime-400 focus:outline-none";

/** Whole days inclusive of both ends — the naive count people expect. */
function daysBetween(from: string, to: string) {
  if (!from || !to) return 0;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 864e5) + 1;
}

/**
 * Leave, from both sides.
 *
 * Staff see only their own balance, history and request button — the server
 * enforces that too, so hiding the rest is presentation rather than the
 * control. Owners and admins additionally get the pending queue.
 */
export default function LeaveClient({
  canManage,
  balances,
  myRequests,
  pendingQueue,
  allRequests,
  leaveTypes,
  employees,
  hasEmployeeRecord,
}: {
  canManage: boolean;
  balances: any[];
  myRequests: any[];
  pendingQueue: any[];
  allRequests: any[];
  leaveTypes: any[];
  employees: any[];
  hasEmployeeRecord: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [deciding, setDeciding] = useState<{ row: any; decision: "approved" | "declined" } | null>(null);
  const [note, setNote] = useState("");
  const [cancelling, setCancelling] = useState<any | null>(null);

  const [form, setForm] = useState({
    leaveType: leaveTypes[0]?.key ?? "annual",
    startDate: "",
    endDate: "",
    days: "",
    reason: "",
    employeeId: "",
  });

  const autoDays = daysBetween(form.startDate, form.endDate);

  const run = (fn: () => Promise<any>, ok: string) =>
    start(async () => {
      try {
        await fn();
        toast.success(ok);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "That didn't work.");
      }
    });

  return (
    <div className="space-y-6">
      <PageHead
        title="Leave"
        sub={
          canManage
            ? "Requests from the team, and who is off when."
            : "Your leave balance and requests."
        }
        action={
          <button
            className="btn btn-primary h-10 px-4 text-sm"
            onClick={() => setAsking(true)}
            disabled={!hasEmployeeRecord && !canManage}
            title={
              !hasEmployeeRecord && !canManage
                ? "Your account is not linked to an employee record yet."
                : undefined
            }
          >
            <Plus size={14} /> Request leave
          </button>
        }
      />

      {/* Balances — always the person's own */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {balances.map((b) => (
          <div key={b.key} className="card p-5">
            <span className="mono-tag mb-1 block text-xs">{b.label}</span>
            <p className="font-mono text-2xl text-bone-50">
              {b.remaining === null ? `${b.used} taken` : `${b.remaining} left`}
            </p>
            <p className="mt-1 text-[11px] text-bone-300">
              {b.remaining === null
                ? b.isPaid
                  ? "No annual limit"
                  : "Unpaid — not deducted from anything"
                : `${b.used} of ${b.allowance} used this year`}
            </p>
          </div>
        ))}
      </div>

      {/* Admin: pending queue first, because it is the thing that needs doing */}
      {canManage && (
        <section>
          <h2 className="mb-3 text-base">
            Awaiting your decision {pendingQueue.length > 0 && `(${pendingQueue.length})`}
          </h2>
          {pendingQueue.length === 0 ? (
            <div className="card p-6 text-center text-sm text-bone-300">
              Nothing waiting on you.
            </div>
          ) : (
            <div className="card divide-y divide-ink-600">
              {pendingQueue.map((r) => (
                <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-bone-50">
                      {r.employees?.full_name ?? "Staff member"}
                    </p>
                    <p className="mono-tag mt-1 text-[11px]">
                      {r.leave_type} · {r.start_date} → {r.end_date} · {r.days}{" "}
                      {Number(r.days) === 1 ? "day" : "days"}
                    </p>
                    {r.reason && (
                      <p className="mt-1.5 text-xs leading-relaxed text-bone-300">{r.reason}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      className="btn btn-primary h-9 px-3.5 text-sm"
                      disabled={busy}
                      onClick={() => { setNote(""); setDeciding({ row: r, decision: "approved" }); }}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      className="btn h-9 px-3.5 text-sm"
                      disabled={busy}
                      onClick={() => { setNote(""); setDeciding({ row: r, decision: "declined" }); }}
                    >
                      <X className="mr-1 h-3.5 w-3.5" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* History */}
      <section>
        <h2 className="mb-3 text-base">{canManage ? "All leave" : "Your requests"}</h2>
        {(canManage ? allRequests : myRequests).length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-bone-300">Nothing here yet.</p>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-bone-300">
              Rest is part of the job. Book it properly rather than disappearing — it makes
              covering your projects possible.
            </p>
          </div>
        ) : (
          <div className="card divide-y divide-ink-600">
            {(canManage ? allRequests : myRequests).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm text-bone-100">
                    {canManage && (
                      <span className="font-medium">{r.employees?.full_name ?? "—"} · </span>
                    )}
                    {r.leave_type}
                  </p>
                  <p className="mono-tag mt-1 text-[11px]">
                    {r.start_date} → {r.end_date} · {r.days}{" "}
                    {Number(r.days) === 1 ? "day" : "days"}
                  </p>
                  {r.decision_note && (
                    <p className="mt-1.5 text-xs text-bone-300">{r.decision_note}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge>{r.status}</Badge>
                  {r.status === "pending" && (
                    <button
                      className="mono-tag text-[11px] text-bone-400 hover:text-rose-400"
                      onClick={() => setCancelling(r)}
                    >
                      cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Request */}
      <Modal
        open={asking}
        onClose={() => setAsking(false)}
        pending={busy}
        title="Request leave"
        eyebrow="Leave"
        description="Your admin is emailed straight away and you'll hear back either way."
        footer={
          <>
            <button className="btn h-10" onClick={() => setAsking(false)} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn btn-primary h-10"
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    requestLeave({
                      leaveType: form.leaveType,
                      startDate: form.startDate,
                      endDate: form.endDate,
                      days: Number(form.days || autoDays),
                      reason: form.reason,
                      employeeId: canManage && form.employeeId ? form.employeeId : undefined,
                    }).then(() => setAsking(false)),
                  "Request sent."
                )
              }
            >
              {busy ? "Sending…" : "Send request"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {canManage && (
            <div>
              <label className="mono-tag mb-1.5 block">On behalf of</label>
              <CustomSelect
                placeholder="Myself"
                value={form.employeeId}
                onChange={(v) => setForm({ ...form, employeeId: v })}
                options={[
                  { value: "", label: "Myself" },
                  ...employees.map((e: any) => ({ value: e.id, label: e.full_name })),
                ]}
              />
            </div>
          )}

          <div>
            <label className="mono-tag mb-1.5 block">Type</label>
            <CustomSelect
              value={form.leaveType}
              onChange={(v) => setForm({ ...form, leaveType: v })}
              options={leaveTypes.map((t: any) => ({
                value: t.key,
                label: t.label,
                badge: t.annual_days > 0 ? `${t.annual_days}/yr` : undefined,
              }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mono-tag mb-1.5 block">From</label>
              <input
                className={field}
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value, days: "" })}
              />
            </div>
            <div>
              <label className="mono-tag mb-1.5 block">To</label>
              <input
                className={field}
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value, days: "" })}
              />
            </div>
          </div>

          <div>
            <label className="mono-tag mb-1.5 block">Days</label>
            <input
              className={field}
              type="number"
              step="0.5"
              min={0}
              value={form.days || (autoDays || "")}
              onChange={(e) => setForm({ ...form, days: e.target.value })}
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-bone-300">
              Counted from your dates. Override it for a half day, or if a Sunday falls in
              the middle — Sunday is already a rest day, so it should not come out of your
              allowance.
            </p>
          </div>

          <div>
            <label className="mono-tag mb-1.5 block">Reason</label>
            <textarea
              className={`${field} min-h-24 resize-y`}
              value={form.reason}
              placeholder="Enough detail that it can be approved without a follow-up question."
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* Decide */}
      <Modal
        open={!!deciding}
        onClose={() => setDeciding(null)}
        pending={busy}
        title={deciding?.decision === "approved" ? "Approve this leave?" : "Decline this leave?"}
        eyebrow="Leave"
        description={
          deciding
            ? `${deciding.row.employees?.full_name ?? "Staff member"} · ${deciding.row.start_date} → ${deciding.row.end_date}`
            : undefined
        }
        footer={
          <>
            <button className="btn h-10" onClick={() => setDeciding(null)} disabled={busy}>
              Cancel
            </button>
            <button
              className={`btn h-10 ${deciding?.decision === "approved" ? "btn-primary" : ""}`}
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    decideLeave(deciding!.row.id, deciding!.decision, note).then(() =>
                      setDeciding(null)
                    ),
                  deciding?.decision === "approved" ? "Approved and emailed." : "Declined and emailed."
                )
              }
            >
              {busy ? "Saving…" : deciding?.decision === "approved" ? "Approve" : "Decline"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="mono-tag block">
            {deciding?.decision === "approved" ? "Anything to add" : "Why not"}
          </label>
          <textarea
            className={`${field} min-h-24 resize-y`}
            value={note}
            placeholder={
              deciding?.decision === "approved"
                ? "Hand the Zenith staging work to Bilal before you go."
                : "We have the Zenith launch that week — try the following Monday?"
            }
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="text-[11px] leading-relaxed text-bone-300">
            This goes in the email. A declined request with no explanation is the fastest way
            to lose someone good.
          </p>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={() =>
          run(() => cancelLeave(cancelling.id).then(() => setCancelling(null)), "Request withdrawn.")
        }
        pending={busy}
        title="Withdraw this request?"
        confirmText="Withdraw"
        description="It is marked cancelled and drops out of the queue. You can request the same dates again afterwards."
      />
    </div>
  );
}
