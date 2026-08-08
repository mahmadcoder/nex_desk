"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import Modal from "@/components/admin/Modal";
import { raiseTicket } from "@/lib/actions/tickets";
import CustomSelect from "@/components/ui/CustomSelect";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none";

/**
 * A client reporting a problem.
 *
 * Priority is offered but described honestly as a starting point — a form where
 * everything is "urgent" tells you nothing, and pretending otherwise sets an
 * expectation nobody agreed to.
 */
export default function RaiseTicket({
  projects,
}: {
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [f, setF] = useState({ subject: "", body: "", priority: "normal", projectId: "" });

  const submit = () =>
    start(async () => {
      const res = await raiseTicket(f);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Sent. We will come back to you.");
      setOpen(false);
      setF({ subject: "", body: "", priority: "normal", projectId: "" });
      router.refresh();
    });

  return (
    <>
      <button className="btn btn-primary gap-2" onClick={() => setOpen(true)}>
        <Plus size={15} /> Report a problem
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        size="lg"
        title="Report a problem"
        description="A real person reads every one of these. The more specific you are, the faster it gets fixed."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={pending || !f.subject.trim() || !f.body.trim()}
            >
              {pending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> Sending…
                </span>
              ) : (
                "Send"
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mono-tag mb-1.5 block">What is wrong, in one line</label>
            <input
              className={field}
              value={f.subject}
              onChange={(e) => setF({ ...f, subject: e.target.value })}
              placeholder="Checkout page shows an error on mobile"
            />
          </div>

          <div>
            <label className="mono-tag mb-1.5 block">What happened</label>
            <textarea
              className={`${field} min-h-[130px] resize-y`}
              value={f.body}
              onChange={(e) => setF({ ...f, body: e.target.value })}
              placeholder="What you were doing, what you expected, and what happened instead. If you saw an error message, paste it here."
            />
            <p className="mt-1 text-[11px] text-bone-400">
              What you did, what you expected, what happened. That is usually enough.
            </p>
          </div>

          {projects.length > 0 && (
            <CustomSelect
              label="Which project"
              value={f.projectId}
              onChange={(v) => setF({ ...f, projectId: v })}
              placeholder="Not sure / something else"
              options={[
                { value: "", label: "Not sure / something else" },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          )}

          <div>
            <CustomSelect
              label="How urgent"
              value={f.priority}
              onChange={(v) => setF({ ...f, priority: v })}
              options={[
                { value: "low", label: "Low — whenever you get to it" },
                { value: "normal", label: "Normal" },
                { value: "high", label: "High — it is blocking work" },
                { value: "urgent", label: "Urgent — the site is down" },
              ]}
            />
            {/* Said plainly rather than quietly ignored. */}
            <p className="mt-1 text-[11px] text-bone-400">
              A starting point for us, not a promise. We may adjust it once we have looked, and
              we will say so if we do.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
