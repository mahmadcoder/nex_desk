"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ListChecks,
  Plus,
  Trash2,
  CalendarDays,
  User,
  UserCheck,
  UserPlus,
  ChevronDown,
  Check,
  Pencil,
} from "lucide-react";
import SuggestTasks from "@/components/admin/SuggestTasks";
import CustomSelect from "@/components/ui/CustomSelect";
import ConfirmModal from "@/components/admin/ConfirmModal";
import TaskDialog from "@/components/admin/TaskDialog";
import {
  saveTask,
  toggleTask,
  deleteTask,
  toggleTaskVisibility,
  setTaskRecurrence,
  assignTask,
} from "@/lib/actions/tasks";
import { fmtDate, agencyDay } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none";

/**
 * Interactive Assignee Dropdown for existing tasks.
 * Allows instant assignment to Myself (Owner/Admin), any Staff member, or Unassigned.
 */
function TaskAssigneeSelect({
  task,
  employees,
  myEmployeeId,
  canManage,
  pending,
  onAssign,
}: {
  task: any;
  employees: { id: string; full_name: string }[];
  myEmployeeId: string | null;
  canManage: boolean;
  pending: boolean;
  onAssign: (taskId: string, employeeId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const assignedId = task.assigned_employee_id;
  const isMine = !!myEmployeeId && assignedId === myEmployeeId;
  const assignedEmployee = employees.find((e) => e.id === assignedId);
  const myEmployee = myEmployeeId ? employees.find((e) => e.id === myEmployeeId) : null;
  const myName = myEmployee?.full_name || "Myself";
  const assigneeName = assignedEmployee?.full_name ?? (isMine ? "You" : null);

  if (!canManage) {
    if (assignedId) {
      return (
        <span
          className={
            isMine
              ? "inline-flex items-center gap-1 font-medium text-lime-300 text-[11px]"
              : "inline-flex items-center gap-1 text-bone-200 text-[11px]"
          }
        >
          <User size={11} /> {assigneeName ?? "Someone"}
          {isMine && " (you)"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
        <UserPlus size={10} /> Unassigned
      </span>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Click to assign task to staff or myself"
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-all ${
          !assignedId
            ? "border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 hover:border-amber-400/70"
            : isMine
              ? "border-lime-400/40 bg-lime-400/10 text-lime-300 hover:bg-lime-400/20 hover:border-lime-400/70 font-semibold"
              : "border-ink-500 bg-ink-700/60 text-bone-200 hover:border-bone-400 hover:text-bone-100"
        }`}
      >
        {!assignedId ? (
          <>
            <UserPlus size={11} className="text-amber-400" />
            <span>Unassigned</span>
          </>
        ) : isMine ? (
          <>
            <UserCheck size={11} className="text-lime-400" />
            <span>Assigned to You</span>
          </>
        ) : (
          <>
            <User size={11} className="text-bone-400" />
            <span className="max-w-[120px] truncate">{assigneeName || "Assigned"}</span>
          </>
        )}
        <ChevronDown
          size={10}
          className={`transition-transform duration-150 opacity-70 ${open ? "rotate-180 text-lime-400" : ""}`}
        />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="nd-select-menu nd-scroll absolute left-0 top-full z-50 mt-1 max-h-64 min-w-[210px] overflow-y-auto rounded-lg border border-ink-600 bg-ink-900/98 p-1.5 shadow-2xl backdrop-blur-md"
        >
          <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-bone-400">
            Assign Task
          </div>

          {/* Unassign option */}
          <button
            type="button"
            onClick={() => {
              onAssign(task.id, null);
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
              !assignedId
                ? "bg-amber-400/15 font-semibold text-amber-300"
                : "text-amber-300/80 hover:bg-ink-800 hover:text-amber-300"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <UserPlus size={12} /> Unassigned
            </span>
            {!assignedId && <Check size={13} className="text-amber-300" />}
          </button>

          {/* Assign to myself (Owner/Admin) */}
          {myEmployeeId && (
            <>
              <div className="my-1 border-t border-ink-700/80" />
              <button
                type="button"
                onClick={() => {
                  onAssign(task.id, myEmployeeId);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                  isMine
                    ? "bg-lime-400/15 font-semibold text-lime-400"
                    : "text-lime-300 hover:bg-ink-800 hover:text-lime-200"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <UserCheck size={12} /> Assign to Myself ({myName})
                </span>
                {isMine && <Check size={13} className="text-lime-400" />}
              </button>
            </>
          )}

          {/* Team Members */}
          {employees.length > 0 && (
            <>
              <div className="my-1 border-t border-ink-700/80" />
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-bone-500">
                Staff Members
              </div>
              {employees
                .filter((e) => e.id !== myEmployeeId)
                .map((e) => {
                  const isSelected = assignedId === e.id;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        onAssign(task.id, e.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-lime-400/15 font-semibold text-lime-400"
                          : "text-bone-200 hover:bg-ink-800 hover:text-bone-50"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <User size={12} className="text-bone-400 shrink-0" />
                        <span className="truncate">{e.full_name}</span>
                      </span>
                      {isSelected && <Check size={13} className="text-lime-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The task board for one project.
 *
 * Provides inline task adding, AI task suggestion, 1-click client visibility toggling,
 * 1-click staff / self task assignment, recurrence configuration, task editing,
 * and safe confirmation-based deletion.
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
  const [isInternal, setIsInternal] = useState(true);
  const [showDone, setShowDone] = useState(false);

  // Dialog & Modal states
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);
  const [editingTask, setEditingTask] = useState<any | null>(null);

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
        isInternal,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Task created.");
      setTitle("");
      setIsInternal(true);
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

  function handleAssign(taskId: string, targetEmployeeId: string | null) {
    start(async () => {
      const res = await assignTask(taskId, targetEmployeeId);
      if (!res.ok) {
        toast.error(res.error || "Could not assign task.");
        return;
      }
      if (targetEmployeeId === myEmployeeId) {
        toast.success("Task assigned to you.");
      } else if (targetEmployeeId) {
        const empName = nameOf(targetEmployeeId) ?? "staff member";
        toast.success(`Task assigned to ${empName}.`);
      } else {
        toast.success("Task unassigned.");
      }
      router.refresh();
    });
  }

  function handleDeleteTask() {
    if (!taskToDelete) return;
    start(async () => {
      const res = await deleteTask(taskToDelete.id);
      if (!res.ok) {
        toast.error(res.error || "Could not delete task.");
        return;
      }
      toast.success("Task deleted.");
      setTaskToDelete(null);
      router.refresh();
    });
  }

  // Agency time check
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
            {aiContext && (
              <SuggestTasks projectId={projectId} context={aiContext} employees={employees} />
            )}
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
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="What needs doing?"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <CustomSelect
              value={who}
              onChange={setWho}
              placeholder="Nobody yet"
              options={[
                { value: "", label: "Nobody yet" },
                ...(myEmployeeId
                  ? [{ value: myEmployeeId, label: `Myself (${nameOf(myEmployeeId) || "You"})` }]
                  : []),
                ...employees
                  .filter((e) => e.id !== myEmployeeId)
                  .map((e) => ({ value: e.id, label: e.full_name })),
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
          <label className="flex items-center gap-2 cursor-pointer text-xs text-bone-300 select-none py-1">
            <input
              type="checkbox"
              checked={!isInternal}
              onChange={(e) => setIsInternal(!e.target.checked)}
              className="accent-lime-400 rounded"
            />
            <span>Publish to Client Portal (unchecked = internal only)</span>
          </label>
          <div className="flex gap-2 pt-1">
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
            return (
              <li key={t.id} className="flex items-start gap-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-lime-400 cursor-pointer"
                  checked={false}
                  disabled={pending}
                  onChange={() => tick(t, true)}
                  aria-label={`Mark "${t.title}" done`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm text-bone-100 ${canManage ? "cursor-pointer hover:text-lime-300 transition-colors" : ""}`}
                      onClick={() => {
                        if (canManage) setEditingTask(t);
                      }}
                      title={canManage ? "Click to edit task details" : undefined}
                    >
                      {t.title}
                    </p>
                    {t.recurrence && (
                      <span className="mono-tag inline-flex shrink-0 items-center gap-1 rounded bg-lime-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-lime-400">
                        🔁 {t.recurrence.charAt(0).toUpperCase() + t.recurrence.slice(1)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-bone-400">
                    {/* Interactive Assignee Picker */}
                    <TaskAssigneeSelect
                      task={t}
                      employees={employees}
                      myEmployeeId={myEmployeeId}
                      canManage={canManage}
                      pending={pending}
                      onAssign={handleAssign}
                    />

                    {/* Due date */}
                    {t.due_date && (
                      <span className={overdue(t) ? "text-rose-300 font-medium" : ""}>
                        <CalendarDays size={10} className="mr-0.5 inline" />
                        {overdue(t) ? "was due " : "due "}
                        {t.due_date}
                      </span>
                    )}

                    {/* Client Portal Visibility Toggle */}
                    <button
                      type="button"
                      disabled={pending || !canManage}
                      onClick={() => {
                        start(async () => {
                          const nextInternal = !t.is_internal;
                          const res = await toggleTaskVisibility(t.id, nextInternal);
                          if (!res.ok) {
                            toast.error(res.error);
                            return;
                          }
                          toast.success(
                            nextInternal
                              ? "Task hidden from client (internal only)."
                              : "Task is now visible to client in portal."
                          );
                          router.refresh();
                        });
                      }}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        t.is_internal
                          ? "border-ink-500 bg-ink-700/60 text-bone-400 hover:border-bone-400 hover:text-bone-200"
                          : "border-sky-400/40 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20"
                      }`}
                      title={
                        canManage
                          ? t.is_internal
                            ? "Click to publish to client portal"
                            : "Click to hide from client portal"
                          : undefined
                      }
                    >
                      {t.is_internal ? "🔒 Internal only" : "👁️ Visible to client"}
                    </button>
                  </div>
                </div>

                {/* Right side controls: Recurrence + Edit + Delete */}
                {canManage && (
                  <div className="mt-0.5 flex shrink-0 items-center gap-2">
                    <div className="w-[136px] sm:w-[145px]">
                      <CustomSelect
                        value={t.recurrence || "none"}
                        placeholder="Repeat…"
                        className="px-2.5 py-1 text-[11px]"
                        onChange={(v) => {
                          start(async () => {
                            const rec =
                              v === "none" || !v
                                ? null
                                : (v as "daily" | "weekly" | "monthly");
                            const res = await setTaskRecurrence(t.id, rec);
                            if (!res.ok) {
                              toast.error(res.error ?? "Could not update task recurrence.");
                            } else if (rec) {
                              toast.success(`Now recurring (${v}) — a fresh copy appears each period.`);
                            } else {
                              toast.success("Task set to one-time (no repeat).");
                            }
                            router.refresh();
                          });
                        }}
                        options={[
                          { value: "none", label: "One-time (No repeat)" },
                          { value: "daily", label: "Every day" },
                          { value: "weekly", label: "Every week" },
                          { value: "monthly", label: "Every month" },
                        ]}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingTask(t)}
                      title="Edit task"
                      className="rounded p-1 text-bone-400 transition-colors hover:text-lime-400"
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setTaskToDelete(t)}
                      title="Delete task"
                      className="rounded p-1 text-bone-400 transition-colors hover:text-rose-400"
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
                    className="mt-1 h-3.5 w-3.5 shrink-0 accent-lime-400 cursor-pointer"
                    checked
                    disabled={pending}
                    onChange={() => tick(t, false)}
                    aria-label={`Reopen "${t.title}"`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-bone-400 line-through">{t.title}</p>
                    {t.done_at && (
                      <p className="text-[11px] text-bone-500">
                        {nameOf(t.done_by) ?? "Someone"} · {fmtDate(t.done_at)}
                        {t.done_via_log_id && " · from a work log"}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setTaskToDelete(t)}
                      title="Delete task"
                      className="rounded p-1 text-bone-500 transition-colors hover:text-rose-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Delete Confirmation Popup */}
      <ConfirmModal
        isOpen={!!taskToDelete}
        title="Delete Task"
        description={`Are you sure you want to delete "${taskToDelete?.title}"? This task will be permanently removed.`}
        confirmText="Delete Task"
        cancelText="Keep Task"
        isDanger={true}
        pending={pending}
        onConfirm={handleDeleteTask}
        onClose={() => setTaskToDelete(null)}
      />

      {/* Edit Task Dialog */}
      {canManage && editingTask && (
        <TaskDialog
          open={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          projects={[{ id: projectId, name: "Project" }]}
          employees={employees}
          defaultProjectId={projectId}
        />
      )}
    </section>
  );
}
