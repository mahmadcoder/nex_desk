"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import { checkIn, checkOut } from "@/lib/actions/attendance";
import { humanDuration, type AttendanceVerdict, type WorkHours } from "@/lib/workHours";
import { fmtTime, TZ_LABEL } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const TONE: Record<AttendanceVerdict["status"], string> = {
  present: "text-lime-400",
  late: "text-amber-400",
  absent: "text-bone-400",
  on_leave: "text-bone-300",
  holiday: "text-lime-400",
  off: "text-bone-400",
};

/**
 * Check in, check out.
 *
 * "Late" is never stored — it is recomputed from Settings every time this
 * renders, so widening the grace period corrects yesterday too rather than
 * leaving old records judged by an old rule.
 */
export default function AttendanceWidget({
  row,
  verdict,
  hours,
}: {
  row: any | null;
  verdict: AttendanceVerdict;
  hours: WorkHours;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<any>, ok: string) =>
    start(async () => {
      const res = await fn();
      if (!res?.ok) toast.error(res?.error ?? "Could not do that.");
      else toast.success(ok);
      router.refresh();
    });

  const inAt = row?.checked_in_at;
  const outAt = row?.checked_out_at;

  const line = (() => {
    switch (verdict.status) {
      case "on_leave":
        return "You are on approved leave today.";
      case "holiday":
        return `${verdict.label ?? "A public holiday"} — no need to check in.`;
      case "off":
        return "Not a working day.";
      case "absent":
        return `Not checked in. The day starts at ${hours.start}.`;
      case "late":
        return `Checked in ${fmtTime(inAt)} — ${verdict.lateBy}m past the ${hours.graceMin}m grace.`;
      default:
        return `Checked in ${fmtTime(inAt)}.`;
    }
  })();

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="mono-tag text-[10px]">Attendance · {TZ_LABEL}</p>
          <p className={`mt-1 text-sm font-medium capitalize ${TONE[verdict.status]}`}>
            {verdict.status.replace("_", " ")}
          </p>
          <p className="mt-0.5 text-xs text-bone-400">{line}</p>
          {outAt && (
            <p className="mt-0.5 text-xs text-bone-300">
              Out {fmtTime(outAt)} · {humanDuration(verdict.presentSec)} present
            </p>
          )}
        </div>

        {/* Nothing to press on a day off or on leave — offering a button there
            would invite a record that contradicts the leave request. */}
        {/* Nothing to press on leave, a day off, or a holiday — offering a
            button there invites a record that contradicts the reason. */}
        {verdict.status !== "on_leave" &&
          verdict.status !== "off" &&
          verdict.status !== "holiday" && (
          <div className="shrink-0">
            {!inAt ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(checkIn, "Checked in.")}
                className="btn btn-primary h-9 gap-1.5 px-4 text-sm"
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                Check in
              </button>
            ) : !outAt ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(checkOut, "Checked out. Have a good evening.")}
                className="btn h-9 gap-1.5 px-4 text-sm"
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                Check out
              </button>
            ) : (
              <span className="mono-tag text-[11px] text-bone-400">Done for today</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
