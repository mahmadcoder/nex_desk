"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Undo2, CheckCheck } from "lucide-react";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";

/** Per-row: clear it, or put it back if it was cleared by mistake. */
export function MarkReadButton({ id, read }: { id: string; read: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title={read ? "Mark as unread" : "Mark as read"}
      aria-label={read ? "Mark as unread" : "Mark as read"}
      onClick={() =>
        start(async () => {
          const res = await markNotificationRead(id, !read);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          router.refresh();
        })
      }
      className="shrink-0 rounded-md p-1.5 text-bone-400 transition-colors hover:bg-ink-700 hover:text-lime-400 disabled:opacity-40"
    >
      {read ? <Undo2 size={14} /> : <Check size={14} />}
    </button>
  );
}

export function MarkAllReadButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (!count) return null;

  return (
    <button
      type="button"
      disabled={pending}
      className="btn h-10 gap-1.5"
      onClick={() =>
        start(async () => {
          const res = await markAllNotificationsRead();
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success("All caught up.");
          router.refresh();
        })
      }
    >
      <CheckCheck size={14} /> {pending ? "Clearing…" : `Mark all ${count} read`}
    </button>
  );
}
