"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CheckCheck } from "lucide-react";
import {
  markClientNotificationRead,
  markAllClientNotificationsRead,
} from "@/lib/actions/clientNotifications";

/**
 * Clearing notifications from the portal.
 *
 * Both actions re-derive the client from the session server-side; the id passed
 * here is only ever used to pick a row within that client's own set.
 */

function MarkOne({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Mark as read"
      title="Mark as read"
      onClick={() =>
        start(async () => {
          const res = await markClientNotificationRead(id);
          if (!res.ok) toast.error(res.error ?? "Could not update that.");
          router.refresh();
        })
      }
      className="shrink-0 rounded-md p-1.5 text-bone-500 transition-colors hover:bg-ink-800 hover:text-lime-400 disabled:opacity-50"
    >
      <Check size={15} />
    </button>
  );
}

function MarkAll() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await markAllClientNotificationsRead();
          if (!res.ok) toast.error(res.error ?? "Could not update those.");
          router.refresh();
        })
      }
      className="mono-tag inline-flex items-center gap-1.5 text-[11px] text-bone-400 transition-colors hover:text-lime-400 disabled:opacity-50"
    >
      <CheckCheck size={13} /> {pending ? "Clearing…" : "Mark all read"}
    </button>
  );
}

const ClientNotificationActions = { MarkOne, MarkAll };
export default ClientNotificationActions;
