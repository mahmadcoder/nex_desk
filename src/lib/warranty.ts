/**
 * The free bug-fix period, in one place.
 *
 * Four surfaces need to agree about this: the handover certificate, the
 * handover email, the client portal and the admin client profile. Before this
 * they disagreed — the certificate hardcoded "30 days" counted from whenever it
 * happened to be printed, while `projects.warranty_days` (14) was what actually
 * got stored and emailed. Everything now reads this file.
 *
 * The period is per PROJECT, not per client: a client with three services has
 * three deals, three projects and three independent windows.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type SupportWindow =
  | { state: "none" }
  | {
      state: "active" | "expired";
      /** How long the window runs in total. */
      days: number;
      /** ISO date the free-fix period began — the day of handover. */
      startsOn: string;
      /** ISO date it ends, inclusive. */
      endsOn: string;
      /** Whole days remaining. Negative once expired. */
      daysLeft: number;
      /** 0-100, how much of the window has been used. */
      elapsedPct: number;
    };

const DEFAULT_DAYS = 14;

/** Midnight-anchored day difference, so a window never changes by the hour. */
function wholeDaysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 864e5);
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Where a project's support window stands.
 *
 * `now` is injectable so a server render and a client render can be given the
 * same instant — passing `Date.now()` straight into JSX hydration-mismatches,
 * which is why the UI computes this on mount rather than during SSR.
 */
export function supportWindow(project: any, now: Date = new Date()): SupportWindow {
  if (!project) return { state: "none" };

  // A project reopened for a change request has `handed_over_at` cleared but
  // KEEPS `warranty_ends_on` (delivery.ts:435). Without this check it would
  // show a live warranty over work that is back in progress — promising free
  // fixes on something we are actively being paid to change.
  const handedOver = project.handed_over_at ?? null;
  if (!handedOver) return { state: "none" };

  // Sold with no support at all. There is no window to count down, and a
  // countdown that reads "expired" from the moment of handover would look
  // broken rather than deliberate.
  // Checked on the stored days alone, not on the end date: handover writes a
  // `warranty_ends_on` of "today" for a 0-day project, which would otherwise
  // render as a window that expired the second it opened.
  const stored = Number(project.warranty_days);
  if (Number.isFinite(stored) && stored === 0) return { state: "none" };

  const days = Number(stored) > 0 ? Number(stored) : DEFAULT_DAYS;
  const start = new Date(handedOver);
  if (Number.isNaN(start.getTime())) return { state: "none" };

  // The stored end date wins whenever it exists: it is what was written at
  // handover and what the client was emailed. Recomputing it here would
  // silently disagree with their paperwork if `warranty_days` ever changed
  // after the fact.
  const end = project.warranty_ends_on
    ? new Date(String(project.warranty_ends_on))
    : new Date(start.getTime() + days * 864e5);
  if (Number.isNaN(end.getTime())) return { state: "none" };

  const daysLeft = wholeDaysBetween(now, end);
  const total = Math.max(1, wholeDaysBetween(start, end));
  const used = total - Math.max(0, daysLeft);

  return {
    state: daysLeft >= 0 ? "active" : "expired",
    days,
    startsOn: isoDate(start),
    endsOn: isoDate(end),
    daysLeft,
    elapsedPct: Math.min(100, Math.max(0, Math.round((used / total) * 100))),
  };
}

/**
 * What the handover certificate states.
 *
 * Kept separate from `supportWindow` on purpose: the PDF must print a period
 * for every delivered project, including ones from before `warranty_ends_on`
 * existed, so it falls back rather than returning "none".
 */
export function warrantyTerms(project: any): { days: number; endsOn: string } {
  const stored = Number(project.warranty_days);
  // 0 is a real answer — a fixed-scope job sold without support — so only an
  // absent or nonsensical value falls back to the default.
  const days = Number.isFinite(stored) && stored >= 0 ? stored : DEFAULT_DAYS;

  if (project.warranty_ends_on) {
    // Once handover freezes the end date, the LENGTH must be derived from it
    // rather than read from the live column. Otherwise editing warranty_days
    // afterwards would reprint the certificate saying "30 days" beside a date
    // that had not moved — two numbers on one page contradicting each other.
    const from = project.handed_over_at ?? project.delivered_at;
    const endsOn = String(project.warranty_ends_on);

    if (from) {
      const span = Math.round(
        (new Date(endsOn).getTime() - new Date(String(from).slice(0, 10)).getTime()) / 864e5
      );
      if (Number.isFinite(span) && span >= 0) return { days: span, endsOn };
    }
    return { days, endsOn };
  }

  const from = project.handed_over_at ?? project.delivered_at;
  const base = from ? new Date(from) : new Date();
  return { days, endsOn: new Date(base.getTime() + days * 864e5).toISOString() };
}
