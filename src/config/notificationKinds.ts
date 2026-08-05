import {
  FileSignature, CheckCircle2, ListChecks, PartyPopper, MessageSquarePlus,
  FileUp, ClipboardList, CalendarClock, UserCheck, Bell, Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * How each kind of notification looks.
 *
 * Separate from `notify.ts` because that file is `"use server"` — every export
 * there must be an async function, so an icon map cannot live in it.
 *
 * `describe()` always returns something. A kind added in code but not listed
 * here still renders correctly, which means shipping a new event never
 * requires touching this file first.
 */
export type NotificationTone = "default" | "good" | "warn";

export type KindStyle = {
  icon: LucideIcon;
  tone: NotificationTone;
  /** Short group name, shown as the eyebrow on a row. */
  label: string;
};

const KINDS: Record<string, KindStyle> = {
  "agreement.accepted":    { icon: FileSignature,     tone: "good",    label: "Agreement" },
  "milestone.approved":    { icon: CheckCircle2,      tone: "good",    label: "Milestone" },
  "kickoff.item":          { icon: ListChecks,        tone: "default", label: "Kickoff" },
  "kickoff.complete":      { icon: PartyPopper,       tone: "good",    label: "Kickoff" },
  "change_request.raised": { icon: MessageSquarePlus, tone: "warn",    label: "Change request" },
  "document.uploaded":     { icon: FileUp,            tone: "default", label: "Document" },
  "worklog.submitted":     { icon: ClipboardList,     tone: "default", label: "Work log" },
  "leave.requested":       { icon: CalendarClock,     tone: "warn",    label: "Leave" },
  "task.assigned":         { icon: ClipboardList,     tone: "default", label: "Task" },
  "leave.decided":         { icon: UserCheck,         tone: "good",    label: "Leave" },
  "salary.paid":           { icon: Wallet,            tone: "good",    label: "Pay" },
  "expense.renewal":       { icon: CalendarClock,     tone: "warn",    label: "Renewal" },
  "client.return_request": { icon: PartyPopper,       tone: "good",    label: "Return" },
};

export function describeKind(kind: string): KindStyle {
  return KINDS[kind] ?? { icon: Bell, tone: "default", label: "Update" };
}

/** Tailwind colour for a tone, matching the rest of the panel. */
export const TONE_CLASS: Record<NotificationTone, string> = {
  default: "text-bone-300",
  good: "text-lime-400",
  warn: "text-amber-400",
};
