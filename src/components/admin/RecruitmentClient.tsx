"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Trash2,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import Modal from "@/components/admin/Modal";
import CustomSelect from "@/components/ui/CustomSelect";
import { saveApplicant, setApplicantStage, hireApplicant, deleteApplicant } from "@/lib/actions/hr";
import { money } from "@/lib/utils";
import { fmtDate } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none";

/** `hired` and `rejected` are outcomes, not columns you drag into. */
const STAGES = [
  { key: "applied", label: "Applied" },
  { key: "screening", label: "Screening" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
] as const;

const ORDER = STAGES.map((s) => s.key);

export default function RecruitmentClient({
  applicants,
  departments,
}: {
  applicants: any[];
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [hiring, setHiring] = useState<any | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const [f, setF] = useState({
    fullName: "",
    email: "",
    phone: "",
    roleApplied: "",
    departmentId: "",
    source: "",
    cvUrl: "",
    portfolioUrl: "",
    expectedSalary: "",
    currency: "USD",
    notes: "",
  });

  const add = () =>
    start(async () => {
      const res = await saveApplicant({
        ...f,
        expectedSalary: Number(f.expectedSalary) || null,
        departmentId: f.departmentId || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Added.");
      setAdding(false);
      setF({
        fullName: "", email: "", phone: "", roleApplied: "", departmentId: "",
        source: "", cvUrl: "", portfolioUrl: "", expectedSalary: "", currency: "USD", notes: "",
      });
      router.refresh();
    });

  const move = (a: any, dir: -1 | 1) => {
    const idx = ORDER.indexOf(a.stage);
    const next = ORDER[idx + dir];
    if (!next) return;
    start(async () => {
      const res = await setApplicantStage(a.id, next);
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  };

  const reject = (a: any) =>
    start(async () => {
      const res = await setApplicantStage(a.id, "rejected");
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });

  const hired = applicants.filter((a) => a.stage === "hired");
  const rejected = applicants.filter((a) => a.stage === "rejected");

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <p className="mono-tag text-[11px]">
          {applicants.filter((a) => ORDER.includes(a.stage)).length} in the pipeline
        </p>
        <button className="btn btn-primary gap-2" onClick={() => setAdding(true)}>
          <Plus size={15} /> Add applicant
        </button>
      </div>

      <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {STAGES.map((col, colIdx) => {
          const items = applicants.filter((a) => a.stage === col.key);
          return (
            <section key={col.key} className="w-[85vw] shrink-0 snap-start sm:w-[70vw] lg:w-auto">
              <h2 className="mono-tag mb-3">
                {col.label} <span className="text-bone-500">({items.length})</span>
              </h2>

              <div className="space-y-2.5">
                {items.map((a) => (
                  <article key={a.id} className="card p-3.5">
                    <p className="text-sm font-medium text-bone-100">{a.full_name}</p>
                    <p className="mono-tag text-[10px]">{a.role_applied}</p>

                    <div className="mt-2 space-y-0.5 text-[11px] text-bone-400">
                      <p className="truncate">{a.email}</p>
                      {a.expected_salary > 0 && (
                        <p>Wants {money(Number(a.expected_salary), a.currency)}</p>
                      )}
                      {a.source && <p>via {a.source}</p>}
                      <p>{fmtDate(a.created_at)}</p>
                    </div>

                    {(a.cv_url || a.portfolio_url) && (
                      <div className="mt-2 flex flex-wrap gap-2.5">
                        {a.cv_url && (
                          <a
                            href={a.cv_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mono-tag inline-flex items-center gap-1 text-[10px] text-lime-400 hover:underline"
                          >
                            <ExternalLink size={9} /> CV
                          </a>
                        )}
                        {a.portfolio_url && (
                          <a
                            href={a.portfolio_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mono-tag inline-flex items-center gap-1 text-[10px] text-lime-400 hover:underline"
                          >
                            <ExternalLink size={9} /> Portfolio
                          </a>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-ink-700 pt-2.5">
                      <button
                        type="button"
                        disabled={pending || colIdx === 0}
                        onClick={() => move(a, -1)}
                        aria-label="Move back"
                        className="rounded p-1 text-bone-500 hover:bg-ink-800 hover:text-bone-200 disabled:invisible"
                      >
                        <ChevronLeft size={14} />
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => reject(a)}
                          title="Not proceeding"
                          className="rounded p-1 text-bone-500 hover:bg-ink-800 hover:text-rose-400"
                        >
                          <XCircle size={13} />
                        </button>
                        {/* Only from Offer. Hiring somebody who has not been
                            offered anything is not a workflow worth supporting. */}
                        {col.key === "offer" && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setHiring(a)}
                            className="mono-tag inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-lime-400 hover:bg-lime-400/10"
                          >
                            <UserPlus size={11} /> Hire
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={pending || colIdx === STAGES.length - 1}
                        onClick={() => move(a, 1)}
                        aria-label="Move forward"
                        className="rounded p-1 text-bone-500 hover:bg-ink-800 hover:text-lime-400 disabled:invisible"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </article>
                ))}

                {!items.length && (
                  <p className="rounded-lg border border-dashed border-ink-600 p-6 text-center text-xs text-bone-500">
                    Nobody here.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {(hired.length > 0 || rejected.length > 0) && (
        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <Closed title="Hired" items={hired} tone="text-lime-400" />
          <Closed title="Not proceeding" items={rejected} tone="text-bone-500" onDelete={router.refresh} />
        </section>
      )}

      {/* ---- Add ---- */}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        pending={pending}
        size="lg"
        title="Add an applicant"
        footer={
          <>
            <button className="btn" onClick={() => setAdding(false)} disabled={pending}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={add}
              disabled={pending || !f.fullName.trim() || !f.email.trim() || !f.roleApplied.trim()}
            >
              {pending ? "Adding…" : "Add"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mono-tag mb-1.5 block">Full name *</label>
            <input className={field} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Email *</label>
            <input className={field} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Phone</label>
            <input className={field} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Role applied for *</label>
            <input
              className={field}
              value={f.roleApplied}
              onChange={(e) => setF({ ...f, roleApplied: e.target.value })}
              placeholder="Senior Full-Stack Developer"
            />
          </div>
          {departments.length > 0 && (
            <div>
              <label className="mono-tag mb-1.5 block">Department</label>
              <CustomSelect
                value={f.departmentId}
                onChange={(v) => setF({ ...f, departmentId: v })}
                options={[
                  { value: "", label: "Not decided" },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>
          )}
          <div>
            <label className="mono-tag mb-1.5 block">Where from</label>
            <input
              className={field}
              value={f.source}
              onChange={(e) => setF({ ...f, source: e.target.value })}
              placeholder="LinkedIn, referral, walk-in"
            />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Expected salary</label>
            <input
              className={field}
              type="number"
              min="0"
              value={f.expectedSalary}
              onChange={(e) => setF({ ...f, expectedSalary: e.target.value })}
            />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Currency</label>
            <input className={field} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">CV link</label>
            <input className={field} value={f.cvUrl} onChange={(e) => setF({ ...f, cvUrl: e.target.value })} />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">Portfolio link</label>
            <input className={field} value={f.portfolioUrl} onChange={(e) => setF({ ...f, portfolioUrl: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mono-tag mb-1.5 block">Notes</label>
            <textarea
              className={`${field} min-h-[70px] resize-y`}
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* ---- Hire ---- */}
      <Modal
        open={!!hiring}
        onClose={() => setHiring(null)}
        pending={pending}
        title={`Hire ${hiring?.full_name ?? ""}?`}
        description="This creates an employee record from the application. Their login and salary are set up afterwards on their profile."
        footer={
          <>
            <button className="btn" onClick={() => setHiring(null)} disabled={pending}>
              Not yet
            </button>
            <button
              className="btn btn-primary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await hireApplicant(hiring.id, startDate);
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success("Employee record created.");
                  setHiring(null);
                  router.push(`/nx-control/employees/${res.employeeId}`);
                })
              }
            >
              {pending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> Hiring…
                </span>
              ) : (
                "Create employee"
              )}
            </button>
          </>
        }
      >
        <label className="mono-tag mb-1.5 block">Start date</label>
        <input
          className={field}
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <p className="mt-2 text-[11px] leading-relaxed text-bone-400">
          Their expected salary of{" "}
          {hiring?.expected_salary > 0
            ? money(Number(hiring.expected_salary), hiring.currency)
            : "— (none recorded)"}{" "}
          is carried over as a starting point. Change it on their profile before the first
          payroll run.
        </p>
      </Modal>
    </>
  );
}

function Closed({
  title,
  items,
  tone,
  onDelete,
}: {
  title: string;
  items: any[];
  tone: string;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!items.length) return null;

  return (
    <div className="card p-5">
      <h2 className="mono-tag mb-3">
        {title} <span className="text-bone-500">({items.length})</span>
      </h2>
      <ul className="divide-y divide-ink-700">
        {items.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className={`truncate ${tone}`}>{a.full_name}</p>
              <p className="mono-tag text-[10px]">
                {a.role_applied} · {fmtDate(a.created_at)}
              </p>
            </div>
            {onDelete && (
              <button
                type="button"
                disabled={pending}
                aria-label={`Delete ${a.full_name}`}
                onClick={() =>
                  start(async () => {
                    const res = await deleteApplicant(a.id);
                    if (!res.ok) toast.error(res.error);
                    router.refresh();
                  })
                }
                className="shrink-0 rounded p-1.5 text-bone-500 hover:bg-ink-800 hover:text-rose-400"
              >
                <Trash2 size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
