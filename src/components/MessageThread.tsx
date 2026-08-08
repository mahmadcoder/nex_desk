"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { fmtDateTime } from "@/lib/datetime";
import {
  postStaffMessage,
  postClientMessage,
  markProjectMessagesRead,
} from "@/lib/actions/messages";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * One project's conversation, used by both the admin panel and the portal.
 *
 * `side` decides which action runs and which bubble is "mine" — not what the
 * server trusts. Both actions re-derive who is calling; a client action also
 * re-checks that the project belongs to them, because otherwise any portal
 * login could post into any project by id.
 */
export default function MessageThread({
  projectId,
  side,
  messages,
  readOnly = false,
  readOnlyReason,
}: {
  projectId: string;
  side: "staff" | "client";
  messages: any[];
  readOnly?: boolean;
  readOnlyReason?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  /**
   * Clear the "N new" badge once staff actually have the thread on screen.
   *
   * `markProjectMessagesRead` existed and was never called from anywhere, so
   * the badge on the project page counted every message a client had ever
   * sent and never went down — it stayed lit after the message was read,
   * answered and forgotten, which is the fastest way to teach somebody to
   * ignore a badge.
   *
   * No loop: the refresh returns the same messages with `read_at` set, the
   * count becomes 0, and the dependency stops changing.
   */
  const unreadFromClient =
    side === "staff"
      ? messages.filter((m: any) => m.sender_kind === "client" && !m.read_at).length
      : 0;

  useEffect(() => {
    if (!unreadFromClient) return;
    let live = true;
    markProjectMessagesRead(projectId)
      .then(() => {
        if (live) router.refresh();
      })
      // Silent on purpose. Failing to clear a badge is not worth a toast on a
      // page somebody opened to read a message.
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [unreadFromClient, projectId, router]);

  const send = () => {
    const text = body.trim();
    if (!text || pending) return;

    start(async () => {
      const res =
        side === "staff"
          ? await postStaffMessage(projectId, text)
          : await postClientMessage(projectId, text);

      if (!res.ok) {
        toast.error(res.error ?? "Could not send that.");
        return;
      }
      setBody("");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col">
      {messages.length ? (
        <ol className="space-y-3">
          {messages.map((m) => {
            const mine = m.sender_kind === side;
            return (
              <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 sm:max-w-[75%] ${
                    mine
                      ? "bg-lime-400/10 text-bone-100 ring-1 ring-inset ring-lime-400/20"
                      : "bg-ink-800 text-bone-200 ring-1 ring-inset ring-ink-600"
                  }`}
                >
                  <p className="mono-tag mb-1 text-[10px]">
                    {m.sender_name || (m.sender_kind === "client" ? "Client" : "Nex Desk")}
                    {" · "}
                    {fmtDateTime(m.created_at)}
                  </p>
                  {/* whitespace-pre-line: people write in paragraphs and a
                      collapsed wall of text reads as carelessness. */}
                  <p className="whitespace-pre-line break-words text-sm leading-relaxed">
                    {m.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="py-6 text-center text-sm text-bone-400">
          Nothing here yet. Anything written stays attached to this project, so it is still
          findable in six months.
        </p>
      )}

      {readOnly ? (
        <p className="mt-5 rounded-lg border border-ink-600 bg-ink-800/60 p-3 text-xs text-bone-400">
          {readOnlyReason ?? "This conversation is read-only."}
        </p>
      ) : (
        <div className="mt-5 border-t border-ink-700 pt-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter is a new line — the convention in
              // every chat people already use.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={3}
            maxLength={4000}
            placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
            className="w-full resize-y rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="mono-tag text-[10px] text-bone-500">
              {body.length > 3500 ? `${4000 - body.length} characters left` : ""}
            </span>
            <button
              type="button"
              onClick={send}
              disabled={pending || !body.trim()}
              className="btn btn-primary h-9 gap-1.5 px-4 text-sm disabled:opacity-60"
            >
              {pending ? (
                <Loader2 size={14} className="animate-spin" aria-hidden />
              ) : (
                <Send size={14} aria-hidden />
              )}
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
