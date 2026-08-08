"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Modal from "@/components/admin/Modal";
import CustomSelect from "@/components/ui/CustomSelect";
import { adminSetAttendance, adminClearAttendance } from "@/lib/actions/attendance";
import { fmtDate } from "@/lib/datetime";
import type { AttendanceVerdict } from "@/lib/workHours";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CELL: Record<string, string> = {
  present: "bg-lime-400/25 text-lime-300",
  late: "bg-amber-400/25 text-amber-300",
  absent: "bg-rose-400/15 text-rose-300",
  on_leave: "bg-ink-600 text-bone-300",
  holiday: "bg-lime-400/15 text-lime-300",
  off: "bg-ink-800 text-bone-600",
};

const MARK: Record<string, string> = {
  present: "P",
  late: "L",
  absent: "A",
  on_leave: "—",
  holiday: "H",
  off: "",
};

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 focus:border-lime-400 focus:outline-none";

/**
 * One square in the month grid, and the correction behind it.
 *
 * The grid was read-only, so a forgotten check-out was a short day forever and
 * anyone who worked without pressing the button was absent for good. Clicking
 * a cell now opens the fix.
 *
 * A reason is mandatory. That is not ceremony: an attendance record that an
 * admin can silently rewrite is not a record, and the reason is what keeps a
 * corrected day distinguishable from a clocked one.
 */
export default function AttendanceCell({
  employeeId,
  employeeName,
  date,
  verdict,
  row,
  editorName,
}: {
  employeeId: string;
  employeeName: string;
  /** YYYY-MM-DD, agency local. */
  date: string;
  verdict: AttendanceVerdict;
  row: any | null;
  /** Who last corrected this day, for the tooltip. */
  editorName?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [inAt, setInAt] = useState(hhmm(row?.checked_in_at));
  const [outAt, setOutAt] = useState(hhmm(row?.checked_out_at));
  const [mark, setMark] = useState<string>(row?.status_override ?? "");
  const [reason, setReason] = useState("");

  const locked = verdict.status === "on_leave" || verdict.status === "holiday";

  const openIt = () => {
    // Re-seed from the row each time. Opening, closing and reopening should
    // show what is stored, not whatever was half-typed last time.
    setInAt(hhmm(row?.checked_in_at));
    setOutAt(hhmm(row?.checked_out_at));
    setMark(row?.status_override ?? "");
    setReason("");
    setOpen(true);
  };

  const save = () =>
    start(async () => {
      const res = await adminSetAttendance({
        employeeId,
        date,
        inAt,
        outAt,
        status: (mark || null) as "present" | "absent" | null,
        reason,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Recorded as a correction.");
      setOpen(false);
      router.refresh();
    });

  const clear = () =>
    start(async () => {
      const res = await adminClearAttendance(employeeId, date, reason || "Cleared by an admin");
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Cleared — the day reads by the normal rules again.");
      setOpen(false);
      router.refresh();
    });

  const title = [
    `${date} — ${verdict.label ?? verdict.status.replace("_", " ")}`,
    verdict.lateBy ? `(${verdict.lateBy}m late)` : "",
    verdict.edited ? `· corrected${editorName ? ` by ${editorName}` : ""}` : "",
    locked ? "" : "· click to change",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button
        type="button"
        onClick={locked ? undefined : openIt}
        disabled={locked}
        title={title}
        aria-label={`${employeeName}, ${date}: ${verdict.status.replace("_", " ")}`}
        className={`relative inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-medium transition-transform ${
          CELL[verdict.status]
        } ${locked ? "cursor-default" : "cursor-pointer hover:scale-110 hover:ring-1 hover:ring-lime-400/60"}`}
      >
        {MARK[verdict.status]}
        {/* A corrected day has to look different at a glance, or the grid is
            quietly lying about how it knows what it knows. */}
        {verdict.edited && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-sky-400 ring-1 ring-ink-900"
          />
        )}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        title={employeeName}
        description={`${fmtDate(date)} — this is recorded as an admin correction, with your name on it.`}
        footer={
          <>
            {row && (
              <button
                className="btn mr-auto text-rose-300 hover:text-rose-200"
                onClick={clear}
                disabled={pending}
              >
                Clear the day
              </button>
            )}
            <button className="btn" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={pending || !reason.trim()}
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="att-in" className="mono-tag mb-1.5 block">
                Arrived
              </label>
              <input
                id="att-in"
                type="time"
                className={field}
                value={inAt}
                onChange={(e) => setInAt(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="att-out" className="mono-tag mb-1.5 block">
                Left
              </label>
              <input
                id="att-out"
                type="time"
                className={field}
                value={outAt}
                onChange={(e) => setOutAt(e.target.value)}
              />
            </div>
          </div>

          <CustomSelect
            label="Or just mark the day"
            value={mark}
            onChange={setMark}
            placeholder="Use the times above"
            options={[
              { value: "", label: "Use the times above" },
              { value: "present", label: "Present — times unknown" },
              { value: "absent", label: "Absent" },
            ]}
          />
          <p className="-mt-2 text-[11px] leading-relaxed text-bone-400">
            Use this when somebody worked but never clocked. It says &ldquo;present, times
            unknown&rdquo; honestly, instead of you inventing a 09:00 that never happened.
          </p>

          <div>
            <label htmlFor="att-why" className="mono-tag mb-1.5 block">
              Why <span className="text-lime-400">*</span>
            </label>
            <input
              id="att-why"
              className={field}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Forgot to check out — confirmed on WhatsApp"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-bone-400">
              Goes on the audit log next to your name. A record anyone can rewrite without
              saying why is not a record.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** An instant → "09:12" in the agency's timezone, for a `type="time"` input. */
function hhmm(at?: string | null): string {
  if (!at) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.NEXT_PUBLIC_AGENCY_TZ || "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(at));
}
