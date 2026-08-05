"use client";

import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/utils";

/**
 * Ask for a video testimonial on WhatsApp.
 *
 * This opens WhatsApp with the message already written and does NOT send it —
 * there is no WhatsApp API in this app, only `wa.me` deep links. That is a
 * deliberate limitation rather than a shortcut: an automated message from a
 * business number gets ignored, whereas the same words arriving from a person
 * the client has actually worked with get answered. You press send.
 *
 * The day-14 cron raises a `feedback.due` notification so this is not something
 * you have to remember on your own.
 */
export default function AskFeedback({
  projectName,
  clientName,
  number,
}: {
  projectName: string;
  clientName: string;
  /** clients.whatsapp, falling back to clients.phone. Null when neither is set. */
  number: string | null;
}) {
  // No number, no button that pretends to work. An empty wa.me link opens
  // WhatsApp on a blank chooser, which looks broken and wastes a click.
  if (!number) {
    return (
      <span
        className="mono-tag inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-600 px-3.5 text-[11px] text-bone-400"
        title="Add a WhatsApp or phone number to this client to enable it"
      >
        <MessageCircle size={12} /> No WhatsApp number on file
      </span>
    );
  }

  const first = String(clientName || "").trim().split(/\s+/)[0] || clientName;

  const message =
    `Hi ${first}, hope ${projectName} is treating you well.\n\n` +
    `Could I ask a small favour? A 30-60 second video on your phone — what you were ` +
    `worried about before we started, how it has gone, and whether you'd work with us ` +
    `again. No script needed, and it really does not need to be neat.\n\n` +
    `If a video isn't your thing, a few written lines are just as welcome. Thank you!`;

  return (
    <a
      href={whatsappLink(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      className="btn h-9 px-4 text-sm"
    >
      <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Ask on WhatsApp
    </a>
  );
}
