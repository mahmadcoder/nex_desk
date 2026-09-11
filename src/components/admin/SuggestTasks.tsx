"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import Modal from "@/components/admin/Modal";
import { saveTask } from "@/lib/actions/tasks";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Draft a task list from the project's scope, then let a person choose.
 *
 * The review step is the whole design. A model that writes straight into the
 * task table produces a board nobody trusts and everybody has to clean up —
 * so nothing reaches `tasks` until it has been ticked, and each accepted line
 * goes through the ordinary `saveTask` so priority, assignee and dates stay
 * where they belong: with a human.
 */
export default function SuggestTasks({
  projectId,
  context,
  employees = [],
}: {
  projectId: string;
  /** Scope, deliverables, services — whatever the deal actually says. */
  context: Record<string, string>;
  employees?: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();
  const [lines, setLines] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>("");
  const [visibleToClient, setVisibleToClient] = useState<boolean>(false);

  const generate = async () => {
    setLoading(true);
    setLines([]);
    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: "task_breakdown", mode: "suggest", text: "", context }),
      });
      const data = await res.json();
      const rawText = data?.text || data?.suggestion;
      if (!res.ok || !rawText) throw new Error(data?.error || "Nothing came back.");

      // The prompt asks for one task per line, but models add bullets and
      // numbers anyway. Strip them rather than trusting the instruction.
      const parsed = String(rawText)
        .split("\n")
        .map((l: string) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
        .filter((l: string) => l.length > 2 && l.length < 200);

      if (!parsed.length) throw new Error("Could not read a task list from that.");

      setLines(parsed);
      // Everything ticked by default — the common case is accepting most of it,
      // and unticking two is less work than ticking eleven.
      setPicked(new Set(parsed.map((_: string, i: number) => i)));
      setOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "Could not generate a task list.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const accept = () =>
    start(async () => {
      const chosen = lines.filter((_, i) => picked.has(i));
      if (!chosen.length) {
        toast.error("Tick at least one, or cancel.");
        return;
      }

      let saved = 0;
      let failed = 0;
      // Sequential on purpose: `sort_order` is derived from the existing count,
      // so firing these in parallel would give several tasks the same position.
      for (const title of chosen) {
        const res = await saveTask({
          projectId,
          title,
          assignedEmployeeId: assignedEmployeeId || null,
          dueDate: null,
          isInternal: !visibleToClient,
        });
        if (res.ok) saved++;
        else failed++;
      }

      if (failed) toast.error(`${saved} added, ${failed} failed.`);
      else {
        toast.success(
          `${saved} task${saved === 1 ? "" : "s"} added (${
            visibleToClient ? "Visible to client" : "Internal only"
          }).`
        );
      }

      setOpen(false);
      setLines([]);
      router.refresh();
    });

  return (
    <>
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="mono-tag inline-flex items-center gap-1.5 text-[11px] text-bone-400 hover:text-lime-400 disabled:opacity-60"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {loading ? "Thinking…" : "Suggest tasks"}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        size="lg"
        title="Suggested tasks"
        description="Drafted from this project's scope. Untick anything you do not want — nothing is saved until you accept."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={accept} disabled={pending || !picked.size}>
              {pending ? "Adding…" : `Add ${picked.size} task${picked.size === 1 ? "" : "s"}`}
            </button>
          </>
        }
      >
        {/* Assignment and client visibility controls */}
        <div className="mb-4 rounded-lg border border-ink-600 bg-ink-800/60 p-3 space-y-3">
          <div>
            <label className="mono-tag mb-1 block text-[10px] text-bone-300">
              Assign selected tasks to
            </label>
            <select
              value={assignedEmployeeId}
              onChange={(e) => setAssignedEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-1.5 text-xs text-bone-100 focus:border-lime-400 focus:outline-none"
            >
              <option value="">Unassigned (assign later)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visibleToClient}
              onChange={(e) => setVisibleToClient(e.target.checked)}
              className="mt-0.5 accent-lime-400 rounded"
            />
            <div className="text-xs">
              <span className="font-medium text-bone-200">
                Publish to Client Portal immediately
              </span>
              <p className="text-[11px] text-bone-400">
                Default: unchecked. Tasks stay <strong className="text-bone-300">Internal only</strong> so you can review, schedule, and assign staff before clients see them.
              </p>
            </div>
          </label>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <span className="mono-tag text-[11px]">
            {picked.size} of {lines.length} selected
          </span>
          <button
            type="button"
            onClick={() =>
              setPicked(picked.size === lines.length ? new Set() : new Set(lines.map((_, i) => i)))
            }
            className="mono-tag text-[11px] text-bone-400 hover:text-lime-400"
          >
            {picked.size === lines.length ? "Untick all" : "Tick all"}
          </button>
        </div>

        <ul className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
          {lines.map((l, i) => (
            <li key={i}>
              {/* The whole row is the target — ticking eleven checkboxes with a
                  thumb is the difference between using this and not. */}
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-ink-600 bg-ink-800/50 p-2.5 text-sm hover:border-ink-500">
                <input
                  type="checkbox"
                  checked={picked.has(i)}
                  onChange={() => toggle(i)}
                  className="mt-0.5 accent-lime-400"
                />
                <span className={picked.has(i) ? "text-bone-100" : "text-bone-500 line-through"}>
                  {l}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[11px] leading-relaxed text-bone-400">
          These are drafts from the scope text, not a plan. Check them against what you actually
          agreed before you assign anyone.
        </p>
      </Modal>
    </>
  );
}
