"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { setTaskStatus } from "@/lib/actions/tasks";
import { fmtDate, agencyDay } from "@/lib/datetime";
import TaskDialog from "@/components/admin/TaskDialog";
import {
  ChevronLeft, ChevronRight, Paperclip, Flag, CalendarDays, Loader2, Plus, Pencil,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The board.
 *
 * Cards move with buttons, not drag-and-drop. Drag is unusable on a phone and
 * unreachable by keyboard, and the main reader of this board is a developer
 * checking their day on the way in — on a phone.
 *
 * No new mutation: `setTaskStatus` already moves a task between exactly these
 * states, stamps done_at/done_by, and enforces that staff may only touch tasks
 * for clients they are assigned to.
 */

/** `backlog` folds into Todo — a two-word distinction nobody was maintaining. */
const COLUMNS = [
  { key: "todo", label: "Todo", statuses: ["backlog", "todo"] },
  { key: "doing", label: "In Progress", statuses: ["doing"] },
  { key: "review", label: "Review", statuses: ["review"] },
  { key: "done", label: "Done", statuses: ["done"] },
] as const;

/** Where a card goes when you press ← or →. */
const ORDER = ["todo", "doing", "review", "done"] as const;

const PRIORITY: Record<string, string> = {
  urgent: "border-rose-400/40 bg-rose-400/10 text-rose-300",
  high: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  normal: "border-ink-600 bg-ink-800 text-bone-400",
  low: "border-ink-600 bg-ink-800 text-bone-500",
};

export default function TaskBoard({
  tasks,
  canManage = false,
  projects = [],
  employees = [],
}: {
  tasks: any[];
  /** Staff move their own cards; only owner/admin hands work out. */
  canManage?: boolean;
  projects?: { id: string; name: string }[];
  employees?: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openTask = (t: any) => {
    setEditing(t);
    setDialogOpen(true);
  };

  const move = (task: any, dir: -1 | 1) => {
    // Which column it is in now, by the same folding the board displays.
    const currentKey = COLUMNS.find((c) => (c.statuses as readonly string[]).includes(task.status))?.key ?? "todo";
    const idx = ORDER.indexOf(currentKey as any);
    const next = ORDER[idx + dir];
    if (!next) return;

    setBusy(task.id);
    start(async () => {
      const res = await setTaskStatus(task.id, next as any);
      if (!res.ok) toast.error(res.error ?? "Could not move that.");
      setBusy(null);
      router.refresh();
    });
  };

  return (
    <>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <button type="button" onClick={openNew} className="btn btn-primary gap-1.5">
            <Plus size={14} /> Add task
          </button>
        </div>
      )}

      {canManage && (
        <TaskDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          task={editing}
          projects={projects}
          employees={employees}
        />
      )}

    {/* One column at a time on a phone; four abreast from lg. */}
    <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
      {COLUMNS.map((col, colIdx) => {
        const items = tasks.filter((t) => (col.statuses as readonly string[]).includes(t.status));

        return (
          <section
            key={col.key}
            className="w-[85vw] shrink-0 snap-start sm:w-[70vw] lg:w-auto"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="mono-tag">
                {col.label} <span className="text-bone-500">({items.length})</span>
              </h2>
            </div>

            <div className="space-y-2.5">
              {items.map((t) => {
                // Compared as agency-local date strings. `new Date(t.due_date)`
                // parses a bare date as UTC midnight, so a task due today read
                // as already overdue from the moment the day began.
                const overdue =
                  t.due_date && t.status !== "done" && t.due_date < agencyDay();
                const working = busy === t.id && pending;

                return (
                  <article
                    key={t.id}
                    className={`card p-3.5 ${overdue ? "border-amber-400/30" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* A button only for the people who can actually change
                          it — a card that looks clickable and then refuses is
                          worse than one that never offered. */}
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => openTask(t)}
                          className={`min-w-0 text-left text-sm font-medium hover:text-lime-400 ${
                            t.status === "done" ? "text-bone-400 line-through" : "text-bone-100"
                          }`}
                        >
                          {t.title}
                        </button>
                      ) : (
                        <p
                          className={`min-w-0 text-sm font-medium ${
                            t.status === "done" ? "text-bone-400 line-through" : "text-bone-100"
                          }`}
                        >
                          {t.title}
                        </p>
                      )}
                      {working && (
                        <Loader2 size={13} className="mt-0.5 shrink-0 animate-spin text-lime-400" />
                      )}
                    </div>

                    {t.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-bone-400">
                        {t.description}
                      </p>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 capitalize ${
                          PRIORITY[t.priority ?? "normal"] ?? PRIORITY.normal
                        }`}
                      >
                        <Flag size={9} aria-hidden /> {t.priority ?? "normal"}
                      </span>

                      {t.due_date && (
                        <span
                          className={`inline-flex items-center gap-1 ${
                            overdue ? "font-medium text-amber-400" : "text-bone-400"
                          }`}
                        >
                          <CalendarDays size={10} aria-hidden /> {fmtDate(t.due_date)}
                        </span>
                      )}

                      {/* Attachments live on project_files, so a task file is
                          still a project file and still obeys visible_to_client. */}
                      {t.attachmentCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-bone-400">
                          <Paperclip size={10} aria-hidden /> {t.attachmentCount}
                        </span>
                      )}
                    </div>

                    {t.projects?.name && (
                      <Link
                        href={`/${process.env.NEXT_PUBLIC_ADMIN_PATH || "nx-control"}/projects/${t.project_id}`}
                        className="mono-tag mt-2 block truncate text-[10px] hover:text-lime-400"
                      >
                        {t.projects.name}
                      </Link>
                    )}

                    {t.assignee && (
                      <p className="mono-tag mt-1 text-[10px] text-bone-500">{t.assignee}</p>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-ink-700 pt-2.5">
                      <button
                        type="button"
                        disabled={pending || colIdx === 0}
                        onClick={() => move(t, -1)}
                        aria-label="Move back"
                        className="rounded p-1 text-bone-500 hover:bg-ink-800 hover:text-bone-200 disabled:invisible"
                      >
                        <ChevronLeft size={14} />
                      </button>

                      {/* Discoverability. The title is clickable, but nobody
                          finds that without something visible saying so. */}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => openTask(t)}
                          aria-label={`Edit "${t.title}"`}
                          title="Edit, reassign or set a due date"
                          className="rounded p-1 text-bone-500 hover:bg-ink-800 hover:text-lime-400"
                        >
                          <Pencil size={13} />
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={pending || colIdx === COLUMNS.length - 1}
                        onClick={() => move(t, 1)}
                        aria-label="Move forward"
                        className="rounded p-1 text-bone-500 hover:bg-ink-800 hover:text-lime-400 disabled:invisible"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}

              {!items.length && (
                <p className="rounded-lg border border-dashed border-ink-600 p-6 text-center text-xs text-bone-500">
                  Nothing here.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
    </>
  );
}
