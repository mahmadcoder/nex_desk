"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Pause, Square, Timer } from "lucide-react";
import { startTimer, stopTimer } from "@/lib/actions/timeTracking";
import { humanDuration } from "@/lib/workHours";
import CustomSelect from "@/components/ui/CustomSelect";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The running clock.
 *
 * Elapsed time is computed from `started_at` on every tick rather than counted
 * up in state — a tab left in the background gets its interval throttled, and a
 * counter that increments once per second would drift behind the real elapsed
 * time by minutes over an afternoon.
 *
 * Pause stops the entry and Resume starts a new one on the same work. There is
 * no paused state to get stuck in.
 */
export default function TimerBar({
  running,
  tasks,
}: {
  running: any | null;
  /** The staff member's open tasks, to start against. */
  tasks: { id: string; title: string; project_id: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const [taskId, setTaskId] = useState("");
  // Remembered across a pause so Resume knows what to restart.
  const [lastWork, setLastWork] = useState<{ taskId: string | null; projectId: string | null } | null>(null);

  useEffect(() => {
    if (!running?.started_at) {
      setElapsed(0);
      return;
    }
    const tick = () =>
      setElapsed(Math.max(0, Math.round((Date.now() - new Date(running.started_at).getTime()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running?.started_at]);

  const label =
    running?.tasks?.title ?? running?.projects?.name ?? running?.note ?? "Untitled work";

  const begin = (opts: { taskId?: string | null; projectId?: string | null }) =>
    start(async () => {
      const res = await startTimer(opts);
      if (!res.ok) toast.error(res.error);
      else setLastWork({ taskId: opts.taskId ?? null, projectId: opts.projectId ?? null });
      router.refresh();
    });

  const halt = (thenResume: boolean) =>
    start(async () => {
      const res = await stopTimer();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${thenResume ? "Paused" : "Stopped"} — ${humanDuration(res.durationSec)} logged.`);
      if (thenResume) setLastWork({ taskId: res.taskId, projectId: res.projectId });
      router.refresh();
    });

  /* ---- Nothing running ---- */
  if (!running) {
    const canResume = !!lastWork;
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-600 bg-ink-800/50 p-2.5">
        <Timer size={15} className="shrink-0 text-bone-400" aria-hidden />

        {/* min-w-0 on the flex child, or a long task title stretches the bar
            past its container instead of truncating inside it. */}
        <div className="min-w-0 flex-1">
          <CustomSelect
            value={taskId}
            onChange={setTaskId}
            placeholder="General work (no task)"
            className="py-1.5 text-xs"
            options={[
              { value: "", label: "General work (no task)" },
              ...tasks.map((t) => ({ value: t.id, label: t.title })),
            ]}
          />
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() => begin({ taskId: taskId || null })}
          className="btn btn-primary h-8 shrink-0 gap-1.5 px-3 text-xs"
        >
          <Play size={13} /> Start
        </button>

        {canResume && (
          <button
            type="button"
            disabled={pending}
            onClick={() => begin(lastWork!)}
            className="mono-tag shrink-0 text-[11px] text-bone-400 hover:text-lime-400"
          >
            Resume last
          </button>
        )}
      </div>
    );
  }

  /* ---- Running ---- */
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-lime-400/30 bg-lime-400/[0.06] p-2.5">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-bone-100">{label}</p>
        <p
          className="text-lg leading-none text-lime-400"
          style={{ fontFamily: "var(--font-mono)" }}
          role="timer"
          aria-live="off"
        >
          {humanDuration(elapsed)}
        </p>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => halt(true)}
        className="btn h-8 shrink-0 gap-1.5 px-3 text-xs"
        title="Pause — stops this segment, Resume starts a new one"
      >
        <Pause size={13} /> Pause
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => halt(false)}
        className="btn btn-primary h-8 shrink-0 gap-1.5 px-3 text-xs"
      >
        <Square size={13} /> Stop
      </button>
    </div>
  );
}
