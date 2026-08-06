/**
 * Date ranges, in one place.
 *
 * `monthRange` / `shiftMonth` / `monthLabel` were private to books/page.tsx;
 * Insights needed the same three, so they live here rather than being copied.
 * Everything is UTC-anchored and returns `YYYY-MM-DD`, which is what every
 * `date` column in this schema stores and what PostgREST expects for `.gte`.
 */

export type Range = { from: string; to: string };

export const iso = (d: Date) => d.toISOString().slice(0, 10);

/** First and last day of a `YYYY-MM` month. */
export function monthRange(ym: string): Range {
  const [y, m] = ym.split("-").map(Number);
  return {
    from: iso(new Date(Date.UTC(y, m - 1, 1))),
    to: iso(new Date(Date.UTC(y, m, 0))),
  };
}

/** `YYYY-MM` shifted by whole months, either direction. */
export function shiftMonth(ym: string, by: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/** Short label for a chart axis — "Aug 26". */
export function monthShort(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

export const RANGE_PRESETS = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "quarter", label: "Last 3 months" },
  { key: "year", label: "This year" },
] as const;

export type PresetKey = (typeof RANGE_PRESETS)[number]["key"];

export const isPreset = (v?: string | null): v is PresetKey =>
  RANGE_PRESETS.some((p) => p.key === v);

/**
 * A named preset as concrete dates.
 *
 * "This week" runs Monday to today rather than Sunday to Saturday — an agency
 * week starts on Monday, and a week that has not finished should not be
 * padded out with days that have not happened.
 */
export function rangeFor(preset: PresetKey, now = new Date()): Range {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const today = iso(now);

  switch (preset) {
    case "week": {
      // getUTCDay: 0 = Sunday. Shift so Monday is the start.
      const dow = (now.getUTCDay() + 6) % 7;
      const monday = new Date(Date.UTC(y, m, now.getUTCDate() - dow));
      return { from: iso(monday), to: today };
    }
    case "last_month": {
      const prev = new Date(Date.UTC(y, m - 1, 1));
      return monthRange(prev.toISOString().slice(0, 7));
    }
    case "quarter":
      return { from: iso(new Date(Date.UTC(y, m - 2, 1))), to: today };
    case "year":
      return { from: iso(new Date(Date.UTC(y, 0, 1))), to: today };
    case "month":
    default:
      return { from: iso(new Date(Date.UTC(y, m, 1))), to: today };
  }
}

/** Every `YYYY-MM` the range touches, oldest first — the x-axis of a monthly chart. */
export function monthsBetween({ from, to }: Range): string[] {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);

  const out: string[] = [];
  const cursor = new Date(Date.UTC(fy, fm - 1, 1));
  const end = new Date(Date.UTC(ty, tm - 1, 1));

  // Hard stop at 60 months: a hand-typed `from` of 1970 would otherwise build
  // an axis with six hundred columns on it.
  while (cursor <= end && out.length < 60) {
    out.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

/** Human label for a resolved range, for the page subtitle. */
export function rangeLabel({ from, to }: Range): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return from === to ? fmt(from) : `${fmt(from)} — ${fmt(to)}`;
}

/** Accepts a date only if it is a real `YYYY-MM-DD`; otherwise null. */
export function asDate(v?: string | null): string | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return Number.isNaN(new Date(v).getTime()) ? null : v;
}
