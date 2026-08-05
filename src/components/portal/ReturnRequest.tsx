"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, CheckCircle2 } from "lucide-react";
import Modal from "@/components/admin/Modal";
import { requestReactivation } from "@/lib/actions/portal";

/**
 * The one thing a paused client can still do.
 *
 * Their portal goes read-only when the account is dormant — but hiding the
 * change-request form and leaving them to go and find an email address is a
 * good way to lose someone who was, at that exact moment, thinking about
 * coming back.
 */
export default function ReturnRequest({
  clientName,
  alreadyRequested,
}: {
  clientName: string;
  alreadyRequested: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(alreadyRequested);

  if (sent) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-lime-400/25 bg-lime-400/[0.06] p-4">
        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-lime-400" />
        <p className="text-sm leading-relaxed text-lime-200">
          Thanks — we have your message and someone will be in touch shortly. There is no need to
          send it again.
        </p>
      </div>
    );
  }

  function submit() {
    start(async () => {
      const res = await requestReactivation(message);
      if (!res.ok) {
        toast.error(res.error ?? "Could not send that just now.");
        return;
      }
      toast.success("Sent. We will be in touch shortly.");
      setSent(true);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button className="btn btn-primary gap-2" onClick={() => setOpen(true)}>
        <Sparkles size={15} /> Work with us again
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        title="Let's pick things back up"
        description="Tell us what you have in mind and we will come back to you. Nothing is committed by sending this."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={pending}>
              {pending ? "Sending…" : "Send"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="mono-tag block text-xs">
            What are you thinking of? (optional)
          </label>
          <textarea
            className="min-h-[120px] w-full resize-y rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="A new project, a change to something we built before, or just a conversation — whatever it is."
          />
          <p className="text-[11px] leading-relaxed text-bone-400">
            This goes straight to the team at Nex Desk, along with your name so we know it is you,
            {clientName ? ` ${clientName.split(" ")[0]}` : ""}.
          </p>
        </div>
      </Modal>
    </>
  );
}
