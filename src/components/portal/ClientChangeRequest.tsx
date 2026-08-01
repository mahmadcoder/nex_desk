"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquarePlus } from "lucide-react";
import { raiseChangeRequest } from "@/lib/actions/delivery";
import Modal from "@/components/admin/Modal";

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm text-bone-50 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none";

/**
 * Lets a client ask for something in writing.
 *
 * The portal was read-only, so every request arrived by WhatsApp or in a reply
 * and was lost the moment the thread moved on. Captured here it gets an owner,
 * a price and an invoice instead of quietly becoming free work.
 */
export default function ClientChangeRequest({
  projectId,
  projectName,
  openRequests,
}: {
  projectId: string;
  projectName: string;
  openRequests: { id: string; title: string; status: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ title: "", description: "" });

  const submit = () => {
    if (!form.title.trim()) return toast.error("Give your request a short title.");
    start(async () => {
      try {
        await raiseChangeRequest({ projectId, ...form });
        toast.success("Request sent. We'll come back to you with a price.");
        setForm({ title: "", description: "" });
        setOpen(false);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "Could not send that request.");
      }
    });
  };

  return (
    <div className="mt-6 border-t border-ink-600 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-bone-50">Need a change?</h3>
          <p className="mt-1 text-xs leading-relaxed text-bone-300">
            Ask here and it goes straight to the team with a written record. We&rsquo;ll price
            anything outside the original scope before starting — never after.
          </p>
        </div>
        <button className="btn h-10 gap-2 px-4 text-sm" onClick={() => setOpen(true)}>
          <MessageSquarePlus className="h-4 w-4 text-lime-400" /> Request a change
        </button>
      </div>

      {!!openRequests.length && (
        <ul className="mt-4 space-y-2">
          {openRequests.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-600 bg-ink-900/60 px-3.5 py-2.5"
            >
              <span className="min-w-0 truncate text-xs text-bone-200">{r.title}</span>
              <span className="mono-tag shrink-0 rounded-full border border-lime-400/25 bg-lime-400/10 px-2.5 py-1 text-[10px] leading-none text-lime-300">
                {r.status === "requested"
                  ? "With the team"
                  : r.status === "quoted"
                    ? "Quote sent — check your email"
                    : r.status === "invoiced"
                      ? "Approved, invoice issued"
                      : r.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        title="Request a change"
        eyebrow={projectName}
        description="Tell us what you'd like different or added."
        footer={
          <>
            <button className="btn h-10" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button className="btn btn-primary h-10" onClick={submit} disabled={pending}>
              {pending ? "Sending…" : "Send request"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mono-tag mb-1.5 block">In one line</label>
            <input
              className={field}
              value={form.title}
              placeholder="e.g. Add a booking form to the contact page"
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block">The detail</label>
            <textarea
              className={`${field} min-h-32 resize-y`}
              value={form.description}
              placeholder="What you want it to do, and anything it needs to connect to. The more specific you are, the more accurate the price."
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-bone-300">
            We&rsquo;ll reply with a fixed price and how many days it adds. Nothing is charged
            or started until you approve it.
          </p>
        </div>
      </Modal>
    </div>
  );
}
