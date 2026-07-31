"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendInvoice } from "@/lib/actions";
import { money } from "@/lib/utils";

import ConfirmModal from "@/components/admin/ConfirmModal";

/**
 * Issues a stage invoice that `lockDeal` parked as a draft.
 *
 * Drafts exist so the whole payment schedule is recorded up front without
 * billing the client for stage 3 on day one. Sending is deliberately a
 * confirmed action: it emails the client and stamps today as the issue date.
 */
export default function SendInvoiceButton({
  invoice,
  label = "Send",
}: {
  invoice: { id: string; invoice_no: string; currency: string; total: number; client_name?: string };
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const send = () => {
    start(async () => {
      try {
        const res = await sendInvoice(invoice.id);
        // The invoice is issued either way — only the email can fail, so say
        // which of the two happened instead of a blanket "sent".
        if (res.ok) toast.success(`${res.invoiceNo} issued and emailed to the client.`);
        else toast.warning(`${res.invoiceNo} issued, but the email failed: ${res.error ?? "unknown error"}`);
        setOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Couldn't issue that invoice.");
      }
    });
  };

  return (
    <>
      <button className="btn btn-primary h-8 px-3 text-xs" onClick={() => setOpen(true)}>
        {label}
      </button>

      <ConfirmModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={send}
        pending={pending}
        isDanger={false}
        title={`Issue ${invoice.invoice_no}?`}
        confirmText={pending ? "Sending…" : "Issue & email"}
        description={
          `This emails ${invoice.client_name ?? "the client"} an invoice for ` +
          `${money(invoice.total, invoice.currency)}, dates it today, and makes it ` +
          `visible in their portal. Drafts stay hidden until you do this.`
        }
      />
    </>
  );
}
