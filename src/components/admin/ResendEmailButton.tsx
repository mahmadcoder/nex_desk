"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Loader2 } from "lucide-react";
import { resendEmail } from "@/lib/actions";

/**
 * Send a failed email again, from the row that failed.
 *
 * Only rendered on `status = 'failed'` rows. Re-sending a message a client
 * already received is worse than the original failure, so the action guards
 * this server-side too rather than trusting the UI.
 */
export default function ResendEmailButton({
  logId,
  disabledReason,
}: {
  logId: string;
  /** Present ⇒ the row cannot be replayed; shown instead of the button. */
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (disabledReason) {
    return (
      <span className="text-[11px] leading-snug text-bone-500" title={disabledReason}>
        {disabledReason}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await resendEmail(logId);
          if (res.ok) toast.success("Sent this time.");
          else toast.error(res.error ?? "Still would not send.");
          router.refresh();
        })
      }
      className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 px-2.5 py-1 text-[11px] text-bone-200 transition-colors hover:border-lime-400 hover:text-lime-400 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 size={12} className="animate-spin" aria-hidden />
      ) : (
        <RotateCcw size={12} aria-hidden />
      )}
      {pending ? "Sending…" : "Resend"}
    </button>
  );
}
