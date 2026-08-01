"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";
import { reactivateClient } from "@/lib/actions/lifecycle";
import ConfirmModal from "@/components/admin/ConfirmModal";

/** Brings a dormant client back, from wherever you happen to be looking at them. */
export default function ReactivateButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <button className="btn h-8 px-3 text-xs" onClick={() => setOpen(true)}>
        <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Reactivate
      </button>

      <ConfirmModal
        isOpen={open}
        onClose={() => setOpen(false)}
        pending={pending}
        isDanger={false}
        title={`Bring ${clientName} back?`}
        confirmText={pending ? "Reactivating…" : "Reactivate & welcome back"}
        description="Returns them to the active client list and emails a short welcome-back pointing at their portal, where everything from last time is still waiting."
        onConfirm={() =>
          start(async () => {
            try {
              const res = await reactivateClient(clientId);
              if (!res.ok) {
                toast.error(res.error || "Could not reactivate that client.");
                return;
              }
              toast.success(res.emailed ? "Reactivated and welcomed back." : "Reactivated.");
              setOpen(false);
              router.refresh();
            } catch (e: any) {
              toast.error(e?.message || "Could not reactivate that client.");
            }
          })
        }
      />
    </>
  );
}
