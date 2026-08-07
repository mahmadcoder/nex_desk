"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers, Pencil } from "lucide-react";
import Modal from "@/components/admin/Modal";
import { updateDealServices } from "@/lib/actions/agreements";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Which services a deal actually covers.
 *
 * `deals.service_slugs` is the only place this lives, and until now nothing
 * displayed it and nothing could change it — a locked deal did not even show
 * it. That mattered because the array decides which questions staff get in
 * Daily Work Logs, so a wrong value was permanent.
 *
 * Editable on locked deals too. Services are a label, not a financial term:
 * nothing here moves the total, the schedule or any invoice.
 */
export default function ServiceTags({
  dealId,
  slugs,
  catalogue,
  canManage = false,
}: {
  dealId: string;
  slugs: string[];
  /** Active services, for the picker and for turning slugs into real names. */
  catalogue: Array<{ slug: string; title: string; category?: string | null }>;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>(slugs);

  const nameOf = (slug: string) =>
    catalogue.find((c) => c.slug === slug)?.title ??
    slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  function save() {
    start(async () => {
      const res = await updateDealServices(dealId, picked);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save that.");
        return;
      }
      toast.success(
        !res.changed
          ? "Nothing changed."
          : res.emailed
            ? "Services updated — the client has been emailed."
            : "Services updated."
      );
      setOpen(false);
      router.refresh();
    });
  }

  const toggle = (slug: string) =>
    setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]));

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mono-tag flex shrink-0 items-center gap-1.5 text-[11px]">
          <Layers size={12} className="text-lime-400" /> Services
        </span>

        {slugs.length ? (
          slugs.map((s) => (
            <span
              key={s}
              className="rounded-full border border-ink-600 bg-ink-800 px-2.5 py-1 text-[11px] text-bone-200"
            >
              {nameOf(s)}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-bone-400">
            None recorded — staff get the default work-log questions.
          </span>
        )}

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setPicked(slugs);
              setOpen(true);
            }}
            className="mono-tag inline-flex items-center gap-1 text-[11px] text-bone-400 hover:text-lime-400"
          >
            <Pencil size={11} /> Edit
          </button>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        pending={pending}
        size="xl"
        title="What this covers"
        description="Only a label — it does not change the price, the schedule or any invoice. It does decide which questions your staff get in Daily Work Logs, and the client is emailed what changed."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          {catalogue.map((c) => {
            const on = picked.includes(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => toggle(c.slug)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  on
                    ? "border-lime-400 bg-lime-400 font-medium text-lime-950"
                    : "border-ink-500 text-bone-200 hover:border-ink-400 hover:bg-ink-800"
                }`}
              >
                {c.title}
              </button>
            );
          })}
        </div>

        {/* A slug the catalogue no longer has — a service that was renamed or
            retired. Shown so it can be removed rather than being invisible. */}
        {picked.filter((s) => !catalogue.some((c) => c.slug === s)).length > 0 && (
          <div className="mt-5 border-t border-ink-700 pt-4">
            <p className="mono-tag mb-2 text-[11px]">No longer in your catalogue</p>
            <div className="flex flex-wrap gap-2">
              {picked
                .filter((s) => !catalogue.some((c) => c.slug === s))
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(s)}
                    className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200"
                  >
                    {nameOf(s)} — click to remove
                  </button>
                ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
