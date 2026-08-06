"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ThumbsUp, BadgeCheck } from "lucide-react";
import { approveMilestone } from "@/lib/actions/portal";
import { fmtDate } from "@/lib/datetime";

/**
 * The client's sign-off on a finished milestone.
 *
 * One click, recorded against their signed-in session with a timestamp —
 * which replaces "they said it looked fine on WhatsApp" as the record of
 * acceptance. Only appears on milestones the team has already marked done.
 */
export default function ApproveMilestone({
  milestoneId,
  approvedAt,
}: {
  milestoneId: string;
  approvedAt: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (approvedAt) {
    return (
      <span className="mono-tag inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-1 text-[10px] leading-none text-emerald-300">
        <BadgeCheck size={11} /> Approved {fmtDate(approvedAt)}
      </span>
    );
  }

  return (
    <button
      className="mono-tag inline-flex shrink-0 items-center gap-1 rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-1 text-[10px] leading-none text-lime-300 transition-colors hover:bg-lime-400/20 disabled:opacity-60"
      disabled={pending}
      title="Confirm you are happy with this milestone"
      onClick={() =>
        start(async () => {
          const res = await approveMilestone(milestoneId);
          if (!res.ok) {
            toast.error(res.error || "Could not record that.");
            return;
          }
          toast.success("Approved — the team has been told. Thank you.");
          router.refresh();
        })
      }
    >
      <ThumbsUp size={11} /> {pending ? "Saving…" : "Approve this"}
    </button>
  );
}
