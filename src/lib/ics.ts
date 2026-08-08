/**
 * Calendar invites, hand-built.
 *
 * A `.ics` attachment is the only way to put a meeting into someone's calendar
 * without asking them to connect an account — it works in Gmail, Outlook, Apple
 * Calendar and every phone, which is what a client base spread across four
 * time zones actually needs.
 *
 * No dependency: RFC 5545 is a handful of rules, and the ones that matter are
 * the ones a library would hide (line folding, escaping, and SEQUENCE).
 */

const CRLF = "\r\n";

/** UTC, basic format: 20260812T110000Z. Local times would need VTIMEZONE. */
function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Commas, semicolons and backslashes are field separators in iCalendar, so an
 * agenda containing "Design, build, ship" would otherwise split the property
 * into three and corrupt the file.
 */
function esc(s: string): string {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * RFC 5545 caps a line at 75 octets; longer ones must continue with a leading
 * space. Outlook in particular drops an event whose lines run long.
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) parts.push(" " + rest);
  return parts.join(CRLF);
}

export type IcsMeeting = {
  id: string;
  title: string;
  agenda?: string | null;
  startsAt: string | Date;
  durationMin: number;
  joinUrl?: string | null;
  /** Increases on every reschedule, or calendars ignore the update. */
  sequence?: number;
  organiser: { name: string; email: string };
  attendees: { name?: string | null; email: string }[];
  /** `CANCELLED` withdraws the event from attendees' calendars. */
  status?: "CONFIRMED" | "CANCELLED";
};

export function buildIcs(m: IcsMeeting): string {
  const start = new Date(m.startsAt);
  const end = new Date(start.getTime() + m.durationMin * 60_000);
  const cancelled = m.status === "CANCELLED";

  const description = [m.agenda?.trim(), m.joinUrl ? `Join: ${m.joinUrl}` : null]
    .filter(Boolean)
    .join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nex Desk//Portal//EN",
    "CALSCALE:GREGORIAN",
    // REQUEST adds or updates; CANCEL removes. Using PUBLISH for both is why
    // cancelled meetings often linger in people's calendars.
    `METHOD:${cancelled ? "CANCEL" : "REQUEST"}`,
    "BEGIN:VEVENT",
    // Stable across reschedules — it is what ties an update to the original.
    `UID:${m.id}@nexdesk`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SEQUENCE:${m.sequence ?? 0}`,
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    `SUMMARY:${esc(m.title)}`,
    description ? `DESCRIPTION:${esc(description)}` : null,
    m.joinUrl ? `LOCATION:${esc(m.joinUrl)}` : null,
    m.joinUrl ? `URL:${esc(m.joinUrl)}` : null,
    `ORGANIZER;CN=${esc(m.organiser.name)}:mailto:${m.organiser.email}`,
    ...m.attendees.map(
      (a) =>
        `ATTENDEE;CN=${esc(a.name || a.email)};RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${a.email}`
    ),
    // 15 minutes is enough warning to finish what you are doing.
    !cancelled ? "BEGIN:VALARM" : null,
    !cancelled ? "TRIGGER:-PT15M" : null,
    !cancelled ? "ACTION:DISPLAY" : null,
    !cancelled ? `DESCRIPTION:${esc(m.title)}` : null,
    !cancelled ? "END:VALARM" : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean) as string[];

  return lines.map(fold).join(CRLF) + CRLF;
}

/** Ready to hand to `sendEmail`'s `rawAttachments`. */
export function icsAttachment(m: IcsMeeting) {
  return {
    filename: "invite.ics",
    content: Buffer.from(buildIcs(m), "utf8"),
  };
}
