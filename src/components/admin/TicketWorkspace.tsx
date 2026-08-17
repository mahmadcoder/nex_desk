"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Loader2, Lock, Sparkles } from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";
import { fmtDateTime } from "@/lib/datetime";
import {
  replyToTicket,
  setTicketStatus,
  assignTicket,
  setTicketPriority,
} from "@/lib/actions/tickets";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_client", label: "Waiting on client" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITIES = ["low", "normal", "high", "urgent"].map((p) => ({ value: p, label: p }));

/**
 * Working a ticket: the thread, the reply box, and triage.
 *
 * Internal notes are visually distinct and never leave the building — the whole
 * reason this table exists is that the conversation about a ticket used to
 * happen somewhere the ticket could not see.
 */
export default function TicketWorkspace({
  ticket,
  messages,
  employees,
  canAssign,
}: {
  ticket: any;
  messages: any[];
  employees: { id: string; full_name: string }[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarising, setSummarising] = useState(false);

  const send = () => {
    if (!body.trim()) return;
    start(async () => {
      const res = await replyToTicket(ticket.id, body, { internal });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(internal ? "Note saved — the client cannot see it." : "Reply sent.");
      setBody("");
      router.refresh();
    });
  };

  const summarise = async () => {
    setSummarising(true);
    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "bug_summary",
          mode: "suggest",
          text: "",
          context: {
            subject: ticket.subject,
            reported: ticket.body,
            project: ticket.projects?.name ?? "",
          },
        }),
      });
      const data = await res.json();
      const rawText = data?.text || data?.suggestion;
      if (!res.ok || !rawText) throw new Error(data?.error || "Nothing came back.");
      setSummary(String(rawText).trim());
    } catch (e: any) {
      toast.error(e?.message || "Could not summarise that.");
    } finally {
      setSummarising(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div>
        {/* The original report */}
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-700 pb-3">
            <div className="min-w-0">
              <p className="mono-tag text-[10px]">
                {ticket.raised_by_name ?? "Client"} · {fmtDateTime(ticket.created_at)}
              </p>
            </div>
            {/* Turns a non-technical report into something a developer can act
                on. Drafts into a panel — it never edits the client's words. */}
            <button
              type="button"
              onClick={summarise}
              disabled={summarising}
              className="mono-tag inline-flex items-center gap-1.5 text-[11px] text-bone-400 hover:text-lime-400 disabled:opacity-60"
            >
              {summarising ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              {summarising ? "Reading…" : "Summarise for a developer"}
            </button>
          </div>

          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-bone-200">
            {ticket.body}
          </p>

          {summary && (
            <div className="mt-4 rounded-lg border border-lime-400/25 bg-lime-400/[0.05] p-3.5">
              <p className="mono-tag mb-1.5 text-[10px] text-lime-400">Developer summary</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-bone-200">
                {summary}
              </p>
              <p className="mt-2 text-[11px] text-bone-400">
                Generated from the client&apos;s words. Check it against the ticket before acting
                on it.
              </p>
            </div>
          )}
        </section>

        {/* Thread */}
        {messages.length > 0 && (
          <ol className="mt-4 space-y-3">
            {messages.map((m) => {
              const mine = m.sender_kind === "staff";
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ring-1 ring-inset sm:max-w-[75%] ${
                      m.is_internal
                        ? "bg-amber-400/[0.07] text-bone-200 ring-amber-400/25"
                        : mine
                          ? "bg-lime-400/10 text-bone-100 ring-lime-400/20"
                          : "bg-ink-800 text-bone-200 ring-ink-600"
                    }`}
                  >
                    <p className="mono-tag mb-1 flex items-center gap-1.5 text-[10px]">
                      {m.is_internal && <Lock size={9} className="text-amber-400" aria-hidden />}
                      {m.sender_name || (mine ? "Nex Desk" : "Client")}
                      {" · "}
                      {fmtDateTime(m.created_at)}
                      {m.is_internal && (
                        <span className="text-amber-400">· internal</span>
                      )}
                    </p>
                    <p className="whitespace-pre-line break-words text-sm leading-relaxed">
                      {m.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {/* Reply */}
        <div className="card mt-4 p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder={internal ? "A note for the team only…" : "Reply to the client…"}
            className={`w-full resize-y rounded-lg border bg-ink-800 px-3 py-2 text-sm focus:outline-none ${
              internal
                ? "border-amber-400/40 focus:border-amber-400"
                : "border-ink-500 focus:border-lime-400"
            }`}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-bone-300">
              <input
                type="checkbox"
                checked={internal}
                onChange={(e) => setInternal(e.target.checked)}
                className="accent-amber-400"
              />
              Internal note — the client never sees this
            </label>
            <button
              type="button"
              onClick={send}
              disabled={pending || !body.trim()}
              className="btn btn-primary h-9 gap-1.5 px-4 text-sm disabled:opacity-60"
            >
              {pending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {internal ? "Save note" : "Send reply"}
            </button>
          </div>
          {!internal && !ticket.first_response_at && (
            <p className="mt-2 text-[11px] text-amber-300">
              This will be the first reply — it sets the response time on this ticket.
            </p>
          )}
        </div>
      </div>

      {/* Triage */}
      <aside className="space-y-4">
        <div className="card p-4">
          <label className="mono-tag mb-1.5 block text-[10px]">Status</label>
          <CustomSelect
            value={ticket.status}
            onChange={(v) =>
              start(async () => {
                const res = await setTicketStatus(ticket.id, v);
                if (!res.ok) toast.error(res.error);
                router.refresh();
              })
            }
            options={STATUSES}
          />

          <label className="mono-tag mb-1.5 mt-4 block text-[10px]">Priority</label>
          <CustomSelect
            value={ticket.priority}
            onChange={(v) =>
              start(async () => {
                const res = await setTicketPriority(ticket.id, v);
                if (!res.ok) toast.error(res.error);
                router.refresh();
              })
            }
            options={PRIORITIES}
          />

          {canAssign && (
            <>
              <label className="mono-tag mb-1.5 mt-4 block text-[10px]">Assigned to</label>
              <CustomSelect
                value={ticket.assigned_employee_id ?? ""}
                onChange={(v) =>
                  start(async () => {
                    const res = await assignTicket(ticket.id, v || null);
                    if (!res.ok) toast.error(res.error);
                    router.refresh();
                  })
                }
                options={[
                  { value: "", label: "Nobody" },
                  ...employees.map((e) => ({ value: e.id, label: e.full_name })),
                ]}
              />
            </>
          )}
        </div>

        {/* SLA. Stamped once each — a reopened ticket does not rewrite how long
            the first reply took. */}
        <div className="card p-4 text-xs">
          <p className="mono-tag mb-2 text-[10px]">Timeline</p>
          <dl className="space-y-1.5">
            <Row label="Raised" value={fmtDateTime(ticket.created_at)} />
            <Row
              label="First reply"
              value={ticket.first_response_at ? fmtDateTime(ticket.first_response_at) : "—"}
              tone={!ticket.first_response_at ? "warn" : undefined}
            />
            <Row
              label="Resolved"
              value={ticket.resolved_at ? fmtDateTime(ticket.resolved_at) : "—"}
            />
          </dl>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-bone-500">{label}</dt>
      <dd className={tone === "warn" ? "text-amber-400" : "text-bone-300"}>{value}</dd>
    </div>
  );
}
