"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateLead, convertLeadToClient } from "@/lib/actions";
import { Badge } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUSES = ["new", "contacted", "quoted", "won", "lost"];

export default function LeadRow({ lead }: { lead: any }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(lead.status);
  const [pending, start] = useTransition();

  const change = (s: string) => {
    setStatus(s);
    start(async () => {
      await updateLead(lead.id, { status: s });
      toast.success(`Marked ${s}.`);
    });
  };

  return (
    <>
      <tr className="cursor-pointer hover:bg-ink-700/30" onClick={() => setOpen((v) => !v)}>
        <td className="px-5 py-3">
          <p>{lead.name}</p>
          <p className="text-xs text-bone-400">{lead.email}</p>
        </td>
        <td className="px-5 py-3 text-bone-400">{(lead.service_slugs ?? []).join(", ") || "—"}</td>
        <td className="px-5 py-3 text-bone-400">{lead.budget_range ?? "—"}</td>
        <td className="px-5 py-3 text-bone-400">{new Date(lead.created_at).toLocaleDateString("en-GB")}</td>
        <td className="px-5 py-3"><Badge>{status}</Badge></td>
        <td className="px-5 py-3 text-right text-bone-400">{open ? "−" : "+"}</td>
      </tr>

      {open && (
        <tr className="bg-ink-800/40">
          <td colSpan={6} className="px-5 py-5">
            <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
              <div>
                <p className="mono-tag">Message</p>
                <p className="mt-2 whitespace-pre-line text-sm text-bone-200">
                  {lead.message || "No message included."}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  {[
                    ["Phone", lead.phone],
                    ["Company", lead.company],
                    ["City", lead.city],
                    ["Country", lead.country],
                    ["Timeline", lead.timeline],
                    ["Source", lead.source],
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <p className="mono-tag">{k}</p>
                      <p className="mt-0.5">{(v as string) || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mono-tag mb-2">Move to</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        disabled={pending}
                        onClick={(e) => { e.stopPropagation(); change(s); }}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          status === s ? "border-lime-400 bg-lime-400 text-lime-950" : "border-ink-500 text-bone-300 hover:border-ink-600"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a href={`mailto:${lead.email}`} className="btn h-9 text-xs">Email</a>
                  {lead.phone && (
                    <a href={`https://wa.me/${String(lead.phone).replace(/\D/g, "")}`}
                      target="_blank" rel="noreferrer" className="btn h-9 text-xs">WhatsApp</a>
                  )}
                  <button
                    className="btn btn-primary h-9 text-xs"
                    onClick={(e) => { e.stopPropagation(); start(() => convertLeadToClient(lead.id) as never); }}
                  >
                    Convert to client
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
