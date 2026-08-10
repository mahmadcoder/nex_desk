"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSignature, CheckCircle2 } from "lucide-react";
import { acceptAgreement } from "@/lib/actions/agreements";
import Modal from "@/components/admin/Modal";
import { fmtDate } from "@/lib/datetime";

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-sm text-bone-50 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none";

/**
 * Accepting the agreement without printing anything.
 *
 * Print → sign → scan → upload is three chances to lose momentum, and a
 * photographed signature proves less than a recorded click: this captures the
 * typed name, the timestamp, the IP and the signed-in session together.
 */
export default function AcceptAgreement({
  deal,
}: {
  deal: {
    id: string;
    deal_no: string;
    title: string;
    amount: string;
    accepted_at: string | null;
    accepted_name: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState("");

  if (deal.accepted_at) {
    return (
      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2.5">
        <CheckCircle2 size={15} className="shrink-0 text-emerald-300" />
        <p className="text-xs text-emerald-200">
          Accepted by <strong>{deal.accepted_name}</strong> on{" "}
          {fmtDate(deal.accepted_at)}
        </p>
      </div>
    );
  }

  const submit = () => {
    if (name.trim().length < 3) return toast.error("Type your full name to accept.");
    start(async () => {
      try {
        const res = await acceptAgreement(deal.id, name);
        if (!res.ok) {
          toast.error(res.error || "Could not record that.");
          return;
        }
        toast.success("Accepted. A copy is on its way to your inbox.");
        setOpen(false);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "Could not record that.");
      }
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-lime-400/30 bg-lime-400/[0.07] px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-bone-50">Your agreement is ready to accept</p>
          <p className="mt-0.5 text-[11px] text-bone-300">
            {deal.title} · {deal.deal_no} · {deal.amount}
          </p>
        </div>
        <button className="btn btn-primary h-9 gap-2 px-4 text-sm" onClick={() => setOpen(true)}>
          <FileSignature className="h-3.5 w-3.5" /> Review &amp; accept
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        title="Accept your agreement"
        eyebrow={deal.deal_no}
        description={`${deal.title} · ${deal.amount}`}
        footer={
          <>
            <button className="btn h-10" onClick={() => setOpen(false)} disabled={pending}>
              Not yet
            </button>
            <button className="btn btn-primary h-10" onClick={submit} disabled={pending}>
              {pending ? "Recording…" : "I accept this agreement"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-bone-200">
            Please read the agreement PDF in your documents before accepting. It sets out the
            full scope, the fixed price, what is <em>not</em> included, the payment schedule
            and the delivery date.
          </p>

          <div>
            <label className="mono-tag mb-1.5 block">Type your full name</label>
            <input
              className={field}
              value={name}
              placeholder="Your full legal name"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <p className="rounded-lg border border-ink-600 bg-ink-900/60 p-3 text-[11px] leading-relaxed text-bone-300">
            By accepting you confirm you have read and agree to the terms in the attached
            agreement. Your name, the date and time, and your network address are recorded
            against your account as evidence of acceptance. You will receive a copy by email
            immediately.
          </p>
        </div>
      </Modal>
    </>
  );
}
