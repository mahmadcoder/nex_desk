import { agencyDay } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * One month, derived from meetings, tasks, deadlines, milestones, leave, and holidays.
 *
 * Derived rather than stored: no duplicate source of truth.
 */

export type CalendarKind =
  | "task"
  | "meeting"
  | "holiday"
  | "deadline"
  | "estimate"
  | "milestone"
  | "leave";

export type CalendarItem = {
  id?: string;
  kind: CalendarKind;
  /** YYYY-MM-DD in the agency timezone. */
  date: string;
  title: string;
  detail?: string | null;
  href?: string | null;
  /** Meetings only. */
  time?: string | null;
  duration_min?: number | null;
  join_url?: string | null;
  agenda?: string | null;
  /** Tasks only. */
  priority?: "urgent" | "high" | "normal" | "low" | null;
  status?: string | null;
  is_overdue?: boolean;
  project_name?: string | null;
  client_name?: string | null;
  assignee_name?: string | null;
};

export const KIND_STYLE: Record<
  CalendarKind,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  task: {
    label: "Task Due",
    dot: "bg-purple-400",
    text: "text-purple-300",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
  meeting: {
    label: "Meeting",
    dot: "bg-lime-400",
    text: "text-lime-300",
    bg: "bg-lime-500/10",
    border: "border-lime-500/30",
  },
  holiday: {
    label: "Holiday",
    dot: "bg-amber-400",
    text: "text-amber-300",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
  },
  deadline: {
    label: "Deadline",
    dot: "bg-rose-400",
    text: "text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
  },
  estimate: {
    label: "Estimate",
    dot: "bg-amber-300",
    text: "text-amber-200",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  milestone: {
    label: "Milestone",
    dot: "bg-sky-400",
    text: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
  },
  leave: {
    label: "Leave",
    dot: "bg-bone-400",
    text: "text-bone-300",
    bg: "bg-ink-700/40",
    border: "border-ink-600",
  },
};

/** A timestamp or date string → the agency-local calendar day. */
const dayOf = (v: string | Date) => agencyDay(v);

/**
 * Every date from start to end inclusive, for a multi-day leave.
 */
function spanDays(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
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
  tasks?: any[];
  holidays?: any[];
}): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  const add = (i: CalendarItem | null) => {
    if (!i?.date) return;
    const list = map.get(i.date) ?? [];
    list.push(i);
    map.set(i.date, list);
  };

  const todayIso = agencyDay();

  // 1. Official Agency Holidays
  for (const h of sources.holidays ?? []) {
    if (!h.holiday_on) continue;
    add({
      id: h.id,
      kind: "holiday",
      date: dayOf(h.holiday_on),
      title: h.name,
      detail: "Official Agency Holiday · Office Closed",
      href: null,
    });
  }

  // 2. Meetings
  for (const m of sources.meetings ?? []) {
    if (m.status === "cancelled") continue;
    add({
      id: m.id,
      kind: "meeting",
      date: dayOf(m.starts_at),
      title: m.title,
      detail: m.clients?.name ? `Client: ${m.clients.name}` : null,
      href: "/nx-control/meetings",
      time: m.starts_at,
      duration_min: m.duration_min ?? 30,
      join_url: m.join_url ?? null,
      agenda: m.agenda ?? null,
      client_name: m.clients?.name ?? null,
      project_name: m.projects?.name ?? null,
    });
  }

  // 3. Tasks
  for (const t of sources.tasks ?? []) {
    if (!t.due_date) continue;
    const isDone = t.status === "done";
    const dueDay = dayOf(t.due_date);
    const isOverdue = !isDone && dueDay < todayIso;

    add({
      id: t.id,
      kind: "task",
      date: dueDay,
      title: t.title,
      detail: t.projects?.name ? `Project: ${t.projects.name}` : null,
      href: t.project_id ? `/nx-control/projects/${t.project_id}` : `/nx-control/tasks`,
      priority: t.priority ?? "normal",
      status: t.status ?? "todo",
      is_overdue: isOverdue,
      project_name: t.projects?.name ?? null,
      client_name: t.projects?.clients?.name ?? null,
      assignee_name: t.employees?.full_name ?? null,
    });
  }

  // 4. Projects: Deadlines & Estimates
  for (const p of sources.projects ?? []) {
    add(
      p.deadline && {
        id: p.id,
        kind: "deadline",
        date: dayOf(p.deadline),
        title: p.name,
        detail: "agreed project deadline",
        href: `/nx-control/projects/${p.id}`,
        client_name: p.clients?.name ?? null,
        project_name: p.name,
      }
    );
    add(
      p.estimated_delivery && p.estimated_delivery !== p.deadline
        ? {
            id: p.id,
            kind: "estimate",
            date: dayOf(p.estimated_delivery),
            title: p.name,
            detail: "estimated delivery date",
            href: `/nx-control/projects/${p.id}`,
            client_name: p.clients?.name ?? null,
            project_name: p.name,
          }
        : null
    );
  }

  // 5. Milestones
  for (const m of sources.milestones ?? []) {
    if (m.is_done) continue;
    add(
      m.due_date && {
        id: m.id,
        kind: "milestone",
        date: dayOf(m.due_date),
        title: m.title,
        detail: m.projects?.name ? `Project: ${m.projects.name}` : null,
        href: m.project_id ? `/nx-control/projects/${m.project_id}` : null,
        project_name: m.projects?.name ?? null,
      }
    );
  }

  // 6. Leave
  for (const l of sources.leave ?? []) {
    if (!l.start_date || !l.end_date) continue;
    for (const d of spanDays(l.start_date, l.end_date)) {
      add({
        id: l.id,
        kind: "leave",
        date: d,
        title: `${l.employees?.full_name ?? "Staff"} on leave`,
        detail: l.leave_type ?? "Approved leave",
        href: "/nx-control/leave",
        assignee_name: l.employees?.full_name ?? null,
      });
    }
  }

  // Rank within a day:
  // 0: holiday, 1: meeting, 2: task, 3: deadline, 4: milestone, 5: estimate, 6: leave
  const rank: Record<CalendarKind, number> = {
    holiday: 0,
    meeting: 1,
    task: 2,
    deadline: 3,
    milestone: 4,
    estimate: 5,
    leave: 6,
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
