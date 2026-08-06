"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleCheck, CircleSlash, Plane } from "lucide-react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { setEmployeeStatus } from "@/lib/actions/staff";
import type { EmployeeStatus } from "@/config/employeeStatus";

/**
 * Whether a staff member can sign in, as a pill you click.
 *
 * The value has always existed and always been enforced — it was just buried
 * six fields down a scrolling Edit modal, and the grid never showed it, so a
 * terminated employee looked identical to an active one.
 *
 * Labelled by what each state DOES. "Terminated" is both alarming and not the
 * word anyone searches for when they want to switch someone off; the stored
 * value is untouched, since the database check constraint and the sign-in
 * refusal in `getCurrentStaff` both depend on the exact strings.
 */
export const STATUS_UI: Record<
  EmployeeStatus,
  { label: string; tone: string; icon: typeof CircleCheck; blurb: string }
> = {
  Active: {
    label: "Active",
    tone: "border-emerald-400/40 bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25",
    icon: CircleCheck,
    blurb: "Signs in normally.",
  },
  "On Leave": {
    label: "On leave",
    tone: "border-amber-400/40 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25",
    icon: Plane,
    blurb: "Away, but can still sign in — they need their own pay and leave pages.",
  },
  Terminated: {
    label: "No access",
    tone: "border-rose-400/40 bg-rose-400/15 text-rose-300 hover:bg-rose-400/25",
    icon: CircleSlash,
    blurb: "Sign-in is refused. Their record and history are kept.",
  },
};

/** Clicking cycles Active → On leave → No access → Active. */
const NEXT: Record<EmployeeStatus, EmployeeStatus> = {
  Active: "On Leave",
  "On Leave": "Terminated",
  Terminated: "Active",
};

export default function StatusControl({
  employeeId,
  name,
  status,
  size = "sm",
}: {
  employeeId: string;
  name: string;
  status: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const current = (STATUS_UI[status as EmployeeStatus] ? status : "Active") as EmployeeStatus;
  const ui = STATUS_UI[current];
  const Icon = ui.icon;
  const next = NEXT[current];

  function apply(to: EmployeeStatus) {
    start(async () => {
      const res = await setEmployeeStatus(employeeId, to);
      if (!res.ok) {
        toast.error(res.error ?? "That didn't work.");
        return;
      }
      toast.success(
        to === "Terminated"
          ? `${name} can no longer sign in.`
          : `${name} is now ${STATUS_UI[to].label.toLowerCase()}.`
      );
      setConfirming(false);
      router.refresh();
    });
  }

  function click() {
    // Only the destructive step asks. Cutting someone off ends a live session.
    if (next === "Terminated") setConfirming(true);
    else apply(next);
  }

  return (
    <>
      <button
        type="button"
        onClick={click}
        disabled={pending}
        title={`${ui.blurb} Click to change.`}
        className={`mono-tag inline-flex cursor-pointer items-center gap-1.5 rounded-full border font-semibold leading-none transition-colors disabled:opacity-50 ${ui.tone} ${
          size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1.5 text-[11px]"
        }`}
      >
        <Icon size={size === "md" ? 13 : 12} /> {ui.label}
      </button>

      <ConfirmModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        pending={pending}
        title={`Cut off ${name}'s access?`}
        confirmText="Revoke access"
        description={`They will be signed out on their next click and cannot sign in again until you switch this back. Their record, work logs, pay history and documents are all kept — this only closes the door.`}
        onConfirm={() => apply("Terminated")}
      />
    </>
  );
}
