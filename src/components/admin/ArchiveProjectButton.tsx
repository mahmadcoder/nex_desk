"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { setProjectArchived } from "@/lib/actions/tasks";

/**
 * Hide a project from the default list, or bring it back.
 *
 * Not a delete and not a status. Everything — invoices, files, the whole
 * history — stays exactly where it was; this only decides whether the project
 * appears in the list somebody opens twenty times a day.
 */
export default function ArchiveProjectButton({
  projectId,
  archived,
}: {
  projectId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setProjectArchived(projectId, !archived);
          if (!res.ok) toast.error(res.error ?? "Could not do that.");
          else
            toast.success(
              archived ? "Back in the active list." : "Archived. Nothing was deleted."
            );
          router.refresh();
        })
      }
      className="mono-tag inline-flex items-center gap-1.5 text-[11px] text-bone-400 hover:text-lime-400 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : archived ? (
        <ArchiveRestore size={12} />
      ) : (
        <Archive size={12} />
      )}
      {archived ? "Restore" : "Archive"}
    </button>
  );
}
