"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Repeat2, BookmarkPlus, CheckCircle2 } from "lucide-react";
import { setRetainer, saveDealTemplate } from "@/lib/actions/agreements";
import Modal from "@/components/admin/Modal";
import CustomSelect from "@/components/ui/CustomSelect";

/* eslint-disable @typescript-eslint/no-explicit-any */

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm focus:border-lime-400 focus:outline-none";

const CYCLES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

/**
 * The two things worth doing with an agreement after it is locked: make it
 * recurring, and keep its shape for next time.
 */
export default function DealExtrasCard({ deal }: { deal: any }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [retainerOpen, setRetainerOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState(deal.title ?? "");

  const [cfg, setCfg] = useState({
    cycle: (deal.billing_cycle as string) || "monthly",
    nextOn: deal.next_renewal_on || new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    endsOn: deal.retainer_ends_on || "",
  });

  const run = (fn: () => Promise<any>, ok: string, done?: () => void) =>
    start(async () => {
      try {
        await fn();
        toast.success(ok);
        done?.();
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message || "That didn't work.");
      }
    });

  return (
    <section className="card space-y-3 border-ink-600 p-5">
      <h2 className="flex items-center gap-2 border-b border-ink-700 pb-3 text-base font-semibold text-bone-50">
        <Repeat2 size={16} className="text-lime-400" /> Agreement options
      </h2>

      {deal.accepted_at && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />
          <p className="text-xs leading-relaxed text-emerald-200">
            Accepted in the portal by <strong>{deal.accepted_name}</strong> on{" "}
            {new Date(deal.accepted_at).toLocaleString("en-GB")}
            {deal.accepted_ip ? ` from ${deal.accepted_ip}` : ""}.
          </p>
        </div>
      )}

      {deal.is_retainer ? (
        <div className="rounded-lg border border-lime-400/25 bg-lime-400/[0.06] p-3">
          <p className="mono-tag text-[11px] text-lime-300">
            {String(deal.billing_cycle ?? "monthly")} retainer
          </p>
          <p className="mt-1 text-xs text-bone-200">
            {deal.next_renewal_on
              ? `Next invoice raises automatically on ${deal.next_renewal_on}.`
              : "Billing is paused — no next date set."}
          </p>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-bone-300">
          One-off agreement. Put it on a retainer and the daily job raises and emails the
          invoice on schedule without you remembering.
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-ink-700 pt-3">
        <button className="btn h-9 px-3.5 text-sm" onClick={() => setRetainerOpen(true)}>
          <Repeat2 className="mr-1.5 h-3.5 w-3.5" />
          {deal.is_retainer ? "Change retainer" : "Make it a retainer"}
        </button>
        <button className="btn h-9 px-3.5 text-sm" onClick={() => setTemplateOpen(true)}>
          <BookmarkPlus className="mr-1.5 h-3.5 w-3.5" /> Save as template
        </button>
      </div>

      <Modal
        open={retainerOpen}
        onClose={() => setRetainerOpen(false)}
        pending={pending}
        title={deal.is_retainer ? "Retainer settings" : "Put this on a retainer"}
        eyebrow={deal.deal_no}
        description="The daily job raises and emails the invoice on each renewal date."
        footer={
          <>
            {deal.is_retainer && (
              <button
                className="btn h-10"
                disabled={pending}
                onClick={() =>
                  run(
                    () => setRetainer(deal.id, { enabled: false }),
                    "Retainer stopped.",
                    () => setRetainerOpen(false)
                  )
                }
              >
                Stop billing
              </button>
            )}
            <button
              className="btn btn-primary h-10"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    setRetainer(deal.id, {
                      enabled: true,
                      cycle: cfg.cycle as any,
                      nextOn: cfg.nextOn,
                      endsOn: cfg.endsOn || undefined,
                    }),
                  "Retainer saved.",
                  () => setRetainerOpen(false)
                )
              }
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mono-tag mb-1.5 block">Bill every</label>
            <CustomSelect
              value={cfg.cycle}
              onChange={(v) => setCfg({ ...cfg, cycle: v })}
              options={CYCLES}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mono-tag mb-1.5 block">Next invoice on</label>
              <input
                className={field}
                type="date"
                value={cfg.nextOn}
                onChange={(e) => setCfg({ ...cfg, nextOn: e.target.value })}
              />
            </div>
            <div>
              <label className="mono-tag mb-1.5 block">Stop after (optional)</label>
              <input
                className={field}
                type="date"
                value={cfg.endsOn}
                onChange={(e) => setCfg({ ...cfg, endsOn: e.target.value })}
              />
            </div>
          </div>
          <p className="rounded-lg border border-ink-600 bg-ink-900/60 p-3 text-[11px] leading-relaxed text-bone-300">
            Each renewal raises an invoice for the full contract value and emails it with the
            PDF attached. Clearing the next date pauses billing without cancelling the
            retainer.
          </p>
        </div>
      </Modal>

      <Modal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        pending={pending}
        title="Save as a template"
        eyebrow={deal.deal_no}
        description="Reuse this shape on the next client without retyping it."
        footer={
          <>
            <button className="btn h-10" onClick={() => setTemplateOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button
              className="btn btn-primary h-10"
              disabled={pending}
              onClick={() =>
                run(
                  () => saveDealTemplate(deal.id, templateName),
                  "Saved. It will appear when you lock the next deal.",
                  () => setTemplateOpen(false)
                )
              }
            >
              {pending ? "Saving…" : "Save template"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="mono-tag block">Template name</label>
          <input
            className={field}
            value={templateName}
            placeholder="Monthly SEO retainer"
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <p className="text-[11px] leading-relaxed text-bone-300">
            Copies the deliverables, payment schedule, scope, exclusions, terms, duration and
            tax — not the client, the dates or the signature.
          </p>
        </div>
      </Modal>
    </section>
  );
}
