import { agencyDay } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * One month, from four things that already exist.
 *
 * Derived rather than stored, for the same reason the portal's activity feed is:
 * a calendar table would be a second source of truth that could disagree with
 * the project it describes, and it would only ever hold events created after it
 * shipped.
 */

export type CalendarKind =
  | "meeting"
  | "deadline"
  | "estimate"
  | "milestone"
  | "leave";

export type CalendarItem = {
  kind: CalendarKind;
  /** YYYY-MM-DD in the agency timezone. */
  date: string;
  title: string;
  detail?: string | null;
  href?: string | null;
  /** Meetings only. */
  time?: string | null;
};

export const KIND_STYLE: Record<CalendarKind, { label: string; dot: string; text: string }> = {
  meeting: { label: "Meeting", dot: "bg-lime-400", text: "text-lime-300" },
  deadline: { label: "Deadline", dot: "bg-rose-400", text: "text-rose-300" },
  estimate: { label: "Estimate", dot: "bg-amber-400", text: "text-amber-300" },
  milestone: { label: "Milestone", dot: "bg-sky-400", text: "text-sky-300" },
  leave: { label: "Leave", dot: "bg-bone-500", text: "text-bone-300" },
};

/** A timestamp or date string → the agency-local calendar day. */
const dayOf = (v: string | Date) => agencyDay(v);

/**
 * Every date from start to end inclusive, for a multi-day leave.
 *
 * Built from the LOCAL date parts, never `toISOString()`. East of UTC, local
 * midnight is the previous day in UTC — so `toISOString().slice(0,10)` shifted
 * every leave day back by one and dropped the last day of the range entirely.
 */
function spanDays(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  // Guard against a reversed or absurd range rather than looping forever.
  let guard = 0;
  while (cur <= end && guard++ < 400) {
    out.push(isoOf(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function buildCalendar(sources: {
  meetings?: any[];
  projects?: any[];
  milestones?: any[];
  leave?: any[];
}): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  const add = (i: CalendarItem | null) => {
    if (!i?.date) return;
    const list = map.get(i.date) ?? [];
    list.push(i);
    map.set(i.date, list);
  };

  for (const m of sources.meetings ?? []) {
    if (m.status === "cancelled") continue;
    add({
      kind: "meeting",
      date: dayOf(m.starts_at),
      title: m.title,
      detail: m.clients?.name ?? null,
      href: "/nx-control/meetings",
      time: m.starts_at,
    });
  }

  for (const p of sources.projects ?? []) {
    add(
      p.deadline && {
        kind: "deadline",
        date: dayOf(p.deadline),
        title: p.name,
        detail: "agreed deadline",
        href: `/nx-control/projects/${p.id}`,
      }
    );
    // Only when it differs — showing both on the same day is noise, and the
    // agreed date is the one that matters if they coincide.
    add(
      p.estimated_delivery && p.estimated_delivery !== p.deadline
        ? {
            kind: "estimate",
            date: dayOf(p.estimated_delivery),
            title: p.name,
            detail: "estimated delivery",
            href: `/nx-control/projects/${p.id}`,
          }
        : null
    );
  }

  for (const m of sources.milestones ?? []) {
    if (m.is_done) continue;
    add(
      m.due_date && {
        kind: "milestone",
        date: dayOf(m.due_date),
        title: m.title,
        detail: m.projects?.name ?? null,
        href: m.project_id ? `/nx-control/projects/${m.project_id}` : null,
      }
    );
  }

  for (const l of sources.leave ?? []) {
    if (!l.start_date || !l.end_date) continue;
    for (const d of spanDays(l.start_date, l.end_date)) {
      add({
        kind: "leave",
        date: d,
        title: `${l.employees?.full_name ?? "Someone"} on leave`,
        detail: l.leave_type ?? null,
        href: "/nx-control/leave",
      });
    }
  }

  // Meetings first within a day — they have a time attached and everything else
  // is an all-day marker.
  const rank: Record<CalendarKind, number> = {
    meeting: 0,
    deadline: 1,
    estimate: 2,
    milestone: 3,
    leave: 4,
  };
  for (const [, items] of map) {
    items.sort((a, b) => rank[a.kind] - rank[b.kind] || a.title.localeCompare(b.title));
  }

  return map;
}

/** The 6×7 grid for a month, Monday-first, with leading/trailing days. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // JS getDay(): 0 = Sunday. Shift so Monday is column 0.
  const lead = (first.getDay() + 6) % 7;
  const startsOn = new Date(year, month, 1 - lead);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(startsOn);
    d.setDate(startsOn.getDate() + i);
    return d;
  });
}

export const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
