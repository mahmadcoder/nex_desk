"use client";
import { useState, useTransition } from "react";
import { toggleMilestone } from "@/lib/actions";
import { Check } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function MilestoneList({ milestones, projectId }: { milestones: any[]; projectId: string }) {
  const [local, setLocal] = useState(milestones);
  const [, start] = useTransition();

  const toggle = (id: string, done: boolean) => {
    setLocal((p) => p.map((m) => (m.id === id ? { ...m, is_done: done } : m)));
    start(() => { toggleMilestone(id, done); });
  };

  if (!local.length) {
    return <div className="card p-10 text-center text-sm text-bone-400">
      No milestones. They're created from the payment schedule when a deal is locked.
    </div>;
  }

  return (
    <div className="card divide-y divide-ink-600">
      {local.map((m) => (
        <label key={m.id} className="flex cursor-pointer items-start gap-3 p-4 hover:bg-ink-700/30">
          <button
            type="button"
            onClick={() => toggle(m.id, !m.is_done)}
            aria-pressed={m.is_done}
            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors ${
              m.is_done ? "border-lime-400 bg-lime-400 text-lime-950" : "border-ink-500"
            }`}
          >
            {m.is_done && <Check size={13} strokeWidth={3} />}
          </button>
          <div className="min-w-0 flex-1">
            <p className={`text-sm ${m.is_done ? "text-bone-400 line-through" : ""}`}>{m.title}</p>
            {m.description && <p className="mt-0.5 text-xs text-bone-400">{m.description}</p>}
          </div>
          <span className="mono-tag shrink-0">{m.due_date ?? "no date"}</span>
        </label>
      ))}
      <p className="p-4 text-xs text-bone-400">
        Ticking a milestone recalculates project progress and updates the client portal instantly.
      </p>
    </div>
  );
}
