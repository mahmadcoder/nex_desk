"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, Plus, Trash2, CalendarDays } from "lucide-react";
import SuggestTasks from "@/components/admin/SuggestTasks";
import CustomSelect from "@/components/ui/CustomSelect";
import { setTaskRecurrence } from "@/lib/actions/tasks";
import { saveTask, toggleTask, deleteTask } from "@/lib/actions/tasks";
import { fmtDate, agencyDay } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none";

/**
 * The task board for one project.
 *
 * Deliberately not a project-management tool. A task is a title, a person and
 * a date — because it is written down straight after being agreed somewhere
 * else, usually on WhatsApp, and anything that takes longer than five seconds
 * to record will simply not get recorded.
 */
export default function TasksCard({
  projectId,
  tasks,
  employees,
  canManage,
  myEmployeeId,
  aiContext,
}: {
  projectId: string;
  tasks: any[];
  employees: { id: string; full_name: string }[];
  canManage: boolean;
  myEmployeeId: string | null;
  /** Scope and deliverables, for the task suggester. Absent = no button. */
  aiContext?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [who, setWho] = useState("");
  const [due, setDue] = useState("");
  const [showDone, setShowDone] = useState(false);

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  const nameOf = (id: string | null) =>
    employees.find((e) => e.id === id)?.full_name ?? null;

  function add() {
    if (!title.trim()) {
      toast.error("Give the task a title.");
      return;
    }
    start(async () => {
      const res = await saveTask({
        projectId,
        title,
        assignedEmployeeId: who || null,
        dueDate: due || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // Person and date stay put — adding three tasks for the same person on
      // the same day is the common case, and re-picking each time is friction
      // for no reason.
      setTitle("");
      setAdding(false);
      router.refresh();
    });
  }

  function tick(task: any, next: boolean) {
    start(async () => {
      const res = await toggleTask(task.id, next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(task: any) {
    start(async () => {
      const res = await deleteTask(task.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  // Agency time. `toISOString()` is UTC, so between midnight and 5am local a
  // task due yesterday stopped showing as overdue — and due dates are set in
  // agency time everywhere else.
  const overdue = (t: any) =>
    t.due_date && t.status !== "done" && t.due_date < agencyDay();

  return (
    <section className="card space-y-3 border-ink-600 p-5">
      <div className="flex items-center justify-between gap-3 border-b border-ink-700 pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-bone-50">
          <ListChecks size={16} className="text-lime-400" /> Tasks
          {!!open.length && <span className="mono-tag text-[11px]">{open.length} open</span>}
        </h2>
        {canManage && !adding && (
          <div className="flex items-center gap-3">
            {aiContext && <SuggestTasks projectId={projectId} context={aiContext} />}
            <button type="button" onClick={() => setAdding(true)} className="btn btn-sm gap-1.5">
              <Plus size={13} /> Add
            </button>
          </div>
        )}
      </div>

      {canManage && adding && (
        <div className="space-y-2 rounded-lg border border-ink-600 bg-ink-800/50 p-3">
          <input
            autoFocus
            className={field}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            // Enter submits: this form exists to be filled in one motion.
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="What needs doing?"
          />
          {/* Stacked on a phone. Side by side these two are ~150px each, and a
              name plus a date control do not fit in that. */}
          <div className="grid gap-2 sm:grid-cols-2">
            <CustomSelect
              value={who}
              onChange={setWho}
              placeholder="Nobody yet"
              options={[
                { value: "", label: "Nobody yet" },
                ...employees.map((e) => ({ value: e.id, label: e.full_name })),
              ]}
            />
            <input
              type="date"
              className={field}
              value={due}
              onChange={(e) => setDue(e.target.value)}
              aria-label="Due date"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={add} disabled={pending}>
              {pending ? "Adding…" : "Add task"}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!open.length && !done.length ? (
        <p className="text-xs leading-relaxed text-bone-300">
          Nothing assigned on this project. Tasks are for the things agreed in a conversation
          and then forgotten — write them here and they show up on the right person&rsquo;s
          dashboard.
        </p>
      ) : (
        <ul className="divide-y divide-ink-700">
          {open.map((t) => {
            const mine = t.assigned_employee_id === myEmployeeId;
            return (
              <li key={t.id} className="flex items-start gap-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-lime-400"
                  checked={false}
                  disabled={pending}
                  onChange={() => tick(t, true)}
                  aria-label={`Mark "${t.title}" done`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-bone-100">{t.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-bone-400">
                    {/* Unassigned is a state worth spotting, not a grey word
                        in a row of grey words — it means nobody has picked
                        this up and nobody will be reminded to. */}
                    {t.assigned_employee_id ? (
                      <span className={mine ? "font-medium text-lime-300" : "text-bone-200"}>
                        {nameOf(t.assigned_employee_id) ?? "Someone"}
                        {mine && " (you)"}
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        Unassigned
                      </span>
                    )}
                    {t.due_date && (
                      <span className={overdue(t) ? "text-rose-300" : ""}>
                        <CalendarDays size={10} className="mr-0.5 inline" />
                        {overdue(t) ? "was due " : "due "}
                        {t.due_date}
                      </span>
                    )}
                  </p>
                </div>
                {canManage && (
                  <div className="mt-0.5 flex shrink-0 items-center gap-2">
                    {/* Turning a task recurring makes it a template: it leaves
                        the board and starts producing dated copies instead.
                        An action menu rather than a value picker — `value` is
                        permanently "", so the placeholder always shows. It
                        needs a real width: as a bare "↻" glyph nobody could
                        tell it was a control at all. */}
                    <div className="w-[124px] sm:w-[130px]">
                      <CustomSelect
                        value=""
                        placeholder="Repeat…"
                        className="px-2.5 py-1 text-[11px]"
                        onChange={(v) => {
                          if (!v) return;
                          start(async () => {
                            const res = await setTaskRecurrence(
                              t.id,
                              v as "daily" | "weekly" | "monthly"
                            );
                            if (!res.ok) toast.error(res.error ?? "Could not set that.");
                            else toast.success("Now recurring — a fresh copy appears each period.");
                            router.refresh();
                          });
                        }}
                        options={[
                          { value: "daily", label: "Every day" },
                          { value: "weekly", label: "Every week" },
                          { value: "monthly", label: "Every month" },
                        ]}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(t)}
                      title="Remove"
                      className="text-bone-400 hover:text-rose-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!!done.length && (
        <div className="border-t border-ink-700 pt-3">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="mono-tag text-[11px] text-bone-400 hover:text-bone-100"
          >
            {showDone ? "Hide" : "Show"} {done.length} finished
          </button>

          {showDone && (
            <ul className="mt-2 divide-y divide-ink-700">
              {done.map((t) => (
                <li key={t.id} className="flex items-start gap-3 py-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-3.5 w-3.5 shrink-0 accent-lime-400"
                    checked
                    disabled={pending}
                    onChange={() => tick(t, false)}
                    aria-label={`Reopen "${t.title}"`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-bone-400 line-through">{t.title}</p>
                    {t.done_at && (
                      <p className="text-[11px] text-bone-500">
                        {nameOf(t.done_by) ?? "Someone"} ·{" "}
                        {fmtDate(t.done_at)}
                        {/* Worth showing: it proves the log→task link is working. */}
                        {t.done_via_log_id && " · from a work log"}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
