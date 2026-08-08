"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { clientReplyToTicket } from "@/lib/actions/tickets";
import { fmtDateTime } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The client's side of a ticket.
 *
 * Internal notes never reach here — `ticketMessages` filters them server-side,
 * so this component could not display one even if it tried.
 */
export default function TicketThread({
  ticketId,
  original,
  messages,
  resolved,
  readOnly,
}: {
  ticketId: string;
  original: { body: string; at: string; who: string };
  messages: any[];
  resolved: boolean;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  const send = () => {
    const text = body.trim();
    if (!text) return;
    start(async () => {
      const res = await clientReplyToTicket(ticketId, text);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.reopened ? "Reopened — we will pick it back up." : "Sent.");
      setBody("");
      router.refresh();
    });
  };

  return (
    <div>
      <section className="card p-5">
        <p className="mono-tag mb-2 text-[10px]">
          {original.who} · {fmtDateTime(original.at)}
        </p>
        <p className="whitespace-pre-line text-sm leading-relaxed text-bone-200">
          {original.body}
        </p>
      </section>

      {messages.length > 0 && (
        <ol className="mt-4 space-y-3">
          {messages.map((m) => {
            const mine = m.sender_kind === "client";
            return (
              <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ring-1 ring-inset sm:max-w-[75%] ${
                    mine
                      ? "bg-lime-400/10 text-bone-100 ring-lime-400/20"
                      : "bg-ink-800 text-bone-200 ring-ink-600"
                  }`}
                >
                  <p className="mono-tag mb-1 text-[10px]">
                    {m.sender_name || (mine ? "You" : "Nex Desk")} · {fmtDateTime(m.created_at)}
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

      {readOnly ? (
        <p className="mt-5 rounded-lg border border-ink-600 bg-ink-800/60 p-3 text-xs text-bone-400">
          Your account is paused, so this thread is read-only. Everything written before is
          still here.
        </p>
      ) : (
        <div className="card mt-4 p-4">
          {resolved && (
            <p className="mb-2 text-xs text-amber-300">
              We marked this resolved. If it is not fixed, replying reopens it — you do not need
              to start a new one.
            </p>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Add anything else that might help…"
            className="w-full resize-y rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={send}
              disabled={pending || !body.trim()}
              className="btn btn-primary h-9 gap-1.5 px-4 text-sm disabled:opacity-60"
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {pending ? "Sending…" : resolved ? "Reply & reopen" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
