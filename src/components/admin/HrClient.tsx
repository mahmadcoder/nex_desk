"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Users } from "lucide-react";
import Modal from "@/components/admin/Modal";
import CustomSelect from "@/components/ui/CustomSelect";
import {
  saveDepartment,
  deleteDepartment,
  addHoliday,
  deleteHoliday,
} from "@/lib/actions/hr";
import { fmtDate } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none";

/* ---------------- Departments ---------------- */

export function DepartmentsPanel({
  departments,
  employees,
}: {
  departments: any[];
  employees: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [f, setF] = useState({ name: "", leadId: "" });
  const [confirm, setConfirm] = useState<any | null>(null);

  const save = () =>
    start(async () => {
      const res = await saveDepartment({ name: f.name, leadId: f.leadId || null });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Saved.");
      setOpen(false);
      setF({ name: "", leadId: "" });
      router.refresh();
    });

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between border-b border-ink-700 pb-3">
        <div>
          <h2 className="text-base font-semibold text-bone-50">Departments</h2>
          <p className="mt-0.5 text-xs text-bone-400">
            Grouping and reporting only — who can see what is still decided by role.
          </p>
        </div>
        <button className="btn btn-sm gap-1.5" onClick={() => setOpen(true)}>
          <Plus size={13} /> Add
        </button>
      </div>

      {!departments.length ? (
        <p className="py-6 text-center text-sm text-bone-400">No departments yet.</p>
      ) : (
        <ul className="divide-y divide-ink-700">
          {departments.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="text-bone-100">{d.name}</p>
                <p className="mono-tag text-[10px]">
                  <Users size={9} className="mr-1 inline" aria-hidden />
                  {d.headcount} {d.headcount === 1 ? "person" : "people"}
                  {d.leadName ? ` · led by ${d.leadName}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirm(d)}
                aria-label={`Delete ${d.name}`}
                className="shrink-0 rounded p-1.5 text-bone-500 hover:bg-ink-800 hover:text-rose-400"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        title="Add a department"
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={pending || !f.name.trim()}
            >
              {pending ? "Saving…" : "Add"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mono-tag mb-1.5 block">Name</label>
            <input
              className={field}
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Engineering"
            />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Head of department (optional)</label>
            <CustomSelect
              value={f.leadId}
              onChange={(v) => setF({ ...f, leadId: v })}
              options={[
                { value: "", label: "Nobody yet" },
                ...employees.map((e) => ({ value: e.id, label: e.full_name })),
              ]}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        pending={pending}
        title={`Delete ${confirm?.name ?? ""}?`}
        description={
          confirm?.headcount
            ? `${confirm.headcount} ${confirm.headcount === 1 ? "person becomes" : "people become"} unassigned. Nobody is removed from the team.`
            : "Nothing else is affected."
        }
        footer={
          <>
            <button className="btn" onClick={() => setConfirm(null)} disabled={pending}>
              Keep it
            </button>
            <button
              className="btn btn-primary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteDepartment(confirm.id);
                  if (!res.ok) toast.error(res.error);
                  else toast.success("Deleted.");
                  setConfirm(null);
                  router.refresh();
                })
              }
            >
              {pending ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <p className="text-sm text-bone-300">
          Deleting a department never deletes people — they simply stop belonging to one.
        </p>
      </Modal>
    </section>
  );
}

/* ---------------- Holidays ---------------- */

export function HolidaysPanel({ holidays }: { holidays: any[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [f, setF] = useState({ date: "", name: "", note: "" });

  const today = new Date().toISOString().slice(0, 10);

  const save = () =>
    start(async () => {
      const res = await addHoliday({ date: f.date, name: f.name, note: f.note });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Added. Attendance will stop marking that day absent.");
      setOpen(false);
      setF({ date: "", name: "", note: "" });
      router.refresh();
    });

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between border-b border-ink-700 pb-3">
        <div>
          <h2 className="text-base font-semibold text-bone-50">Public holidays</h2>
          <p className="mt-0.5 text-xs text-bone-400">
            Nobody is marked absent or late on these days.
          </p>
        </div>
        <button className="btn btn-sm gap-1.5" onClick={() => setOpen(true)}>
          <Plus size={13} /> Add
        </button>
      </div>

      {!holidays.length ? (
        <p className="py-6 text-center text-sm text-bone-400">
          None recorded. Until one is, a public holiday reads as an absence.
        </p>
      ) : (
        <ul className="divide-y divide-ink-700">
          {holidays.map((h) => {
            const past = h.holiday_on < today;
            return (
              <li
                key={h.id}
                className={`flex items-center justify-between gap-3 py-3 text-sm ${past ? "opacity-55" : ""}`}
              >
                <div className="min-w-0">
                  <p className="text-bone-100">{h.name}</p>
                  <p className="mono-tag text-[10px]">
                    {fmtDate(h.holiday_on)}
                    {h.note ? ` · ${h.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`Delete ${h.name}`}
                  onClick={() =>
                    start(async () => {
                      const res = await deleteHoliday(h.id);
                      if (!res.ok) toast.error(res.error);
                      router.refresh();
                    })
                  }
                  className="shrink-0 rounded p-1.5 text-bone-500 hover:bg-ink-800 hover:text-rose-400"
                >
                  {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        title="Add a public holiday"
        description="Entered per year rather than as a recurring rule — Eid moves against the Gregorian calendar, so a fixed month-and-day would be wrong more often than right."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={pending || !f.date || !f.name.trim()}
            >
              {pending ? "Adding…" : "Add"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mono-tag mb-1.5 block">Date</label>
            <input
              className={field}
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Name</label>
            <input
              className={field}
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Independence Day"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mono-tag mb-1.5 block">Note (optional)</label>
            <input
              className={field}
              value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
              placeholder="Office closed, on-call only"
            />
          </div>
        </div>
      </Modal>
    </section>
  );
}
