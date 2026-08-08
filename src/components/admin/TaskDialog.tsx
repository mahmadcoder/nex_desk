"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Modal from "@/components/admin/Modal";
import CustomSelect from "@/components/ui/CustomSelect";
import { saveTask, deleteTask } from "@/lib/actions/tasks";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none";

export type TaskLite = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  project_id?: string | null;
  assigned_employee_id?: string | null;
  due_date?: string | null;
  priority?: string | null;
  status?: string | null;
};

/**
 * Creating a task, and — the part that did not exist — changing one.
 *
 * `saveTask` has always accepted an assignee, a due date and a priority, and
 * has always handled both insert and update. The only caller was the Add form
 * on a project page, which only ever created. So once a task existed, nothing
 * in the app could hand it to somebody else.
 *
 * One dialog for both, deliberately: two forms over the same action drift, and
 * then "edit" quietly stops offering a field that "add" has.
 */
export default function TaskDialog({
  open,
  onClose,
  task,
  projects,
  employees,
  /** Pre-selected when adding from inside a project. */
  defaultProjectId,
}: {
  open: boolean;
  onClose: () => void;
  /** null ⇒ creating. */
  task: TaskLite | null;
  projects: { id: string; name: string }[];
  employees: { id: string; full_name: string }[];
  defaultProjectId?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [f, setF] = useState({
    title: "",
    description: "",
    projectId: "",
    who: "",
    due: "",
    priority: "normal",
  });

  // Re-seeded whenever the dialog is opened against a different task. Without
  // this, opening card A then card B would show A's values against B's id —
  // which is how you reassign the wrong person's work.
  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    setF({
      title: task?.title ?? "",
      description: task?.description ?? "",
      projectId: task?.project_id ?? defaultProjectId ?? projects[0]?.id ?? "",
      who: task?.assigned_employee_id ?? "",
      due: task?.due_date ?? "",
      priority: task?.priority ?? "normal",
    });
  }, [open, task, defaultProjectId, projects]);

  const editing = !!task?.id;

  const save = () =>
    start(async () => {
      const res = await saveTask({
        id: task?.id ?? null,
        projectId: f.projectId,
        title: f.title,
        description: f.description || null,
        assignedEmployeeId: f.who || null,
        dueDate: f.due || null,
        priority: f.priority as any,
        // Not sent when editing: the board owns the column, and posting a
        // status here would silently drag a card back to Todo on every save.
        ...(editing ? {} : { status: "todo" as const }),
      });

      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Saved." : "Added.");
      onClose();
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      const res = await deleteTask(task!.id!);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Deleted.");
      onClose();
      router.refresh();
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      pending={pending}
      size="lg"
      title={editing ? "Edit task" : "Add a task"}
      description={
        editing
          ? "Changing who it belongs to moves it straight onto their dashboard."
          : "Give it a title and a person. Everything else can follow."
      }
      footer={
        <>
          {editing &&
            (confirmDelete ? (
              <span className="mr-auto flex items-center gap-2">
                <span className="text-xs text-bone-300">Delete it?</span>
                <button
                  className="btn btn-sm text-rose-300 hover:text-rose-200"
                  onClick={remove}
                  disabled={pending}
                >
                  Yes, delete
                </button>
                <button className="btn btn-sm" onClick={() => setConfirmDelete(false)}>
                  No
                </button>
              </span>
            ) : (
              <button
                className="btn mr-auto text-bone-400 hover:text-rose-300"
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
              >
                Delete
              </button>
            ))}
          <button className="btn" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={pending || !f.title.trim() || !f.projectId}
          >
            {pending ? "Saving…" : editing ? "Save" : "Add task"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="task-title" className="mono-tag mb-1.5 block">
            What needs doing
          </label>
          <input
            id="task-title"
            autoFocus
            className={field}
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
            placeholder="Fix the header on mobile"
          />
        </div>

        <CustomSelect
          label="Project"
          value={f.projectId}
          onChange={(v) => setF({ ...f, projectId: v })}
          placeholder="Pick a project"
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <CustomSelect
            label="Assign to"
            value={f.who}
            onChange={(v) => setF({ ...f, who: v })}
            placeholder="Nobody yet"
            options={[
              { value: "", label: "Nobody yet" },
              ...employees.map((e) => ({ value: e.id, label: e.full_name })),
            ]}
          />
          <div>
            <label htmlFor="task-due" className="mono-tag mb-1.5 block">
              Due
            </label>
            <input
              id="task-due"
              type="date"
              className={field}
              value={f.due}
              onChange={(e) => setF({ ...f, due: e.target.value })}
            />
          </div>
        </div>

        <CustomSelect
          label="Priority"
          value={f.priority}
          onChange={(v) => setF({ ...f, priority: v })}
          options={[
            { value: "low", label: "Low" },
            { value: "normal", label: "Normal" },
            { value: "high", label: "High" },
            { value: "urgent", label: "Urgent" },
          ]}
        />

        <div>
          <label htmlFor="task-notes" className="mono-tag mb-1.5 block">
            Notes
          </label>
          <textarea
            id="task-notes"
            className={`${field} min-h-[80px] resize-y`}
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            placeholder="Anything the person picking this up would otherwise have to ask for."
          />
        </div>
      </div>
    </Modal>
  );
}
