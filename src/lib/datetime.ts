/**
 * One clock for the whole app.
 *
 * Before this, exactly one of ~112 date/time render sites passed a `timeZone`
 * — the decorative clock on the marketing homepage. Everything else resolved
 * to whatever the runtime happened to be in:
 *
 *   • server components on Vercel → UTC, five hours behind Karachi
 *   • `"use client"` components   → the viewer's own zone
 *   • emails and PDFs (Node)      → UTC, with no browser able to correct it
 *
 * So the same event showed a different time on two adjacent screens, and
 * anything logged after 7pm PKT was filed under "Yesterday".
 *
 * Everything here is pinned to `AGENCY_TZ`. Import these rather than calling
 * `toLocaleDateString` inline.
 */

/**
 * Where the agency is.
 *
 * An env var rather than a `settings` column on purpose: this has to work
 * identically in server components, client components, emails and PDFs, and
 * `NEXT_PUBLIC_*` is the only mechanism available in all four without a
 * context provider in every layout. It follows the existing convention
 * (`NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_ADMIN_PATH`) and changes roughly
 * when the agency physically relocates.
 */
export const AGENCY_TZ = process.env.NEXT_PUBLIC_AGENCY_TZ || "Asia/Karachi";

/**
 * Short label shown beside a time so nobody has to guess whose clock it is.
 *
 * Not derived from Intl: `timeZoneName: "short"` on Asia/Karachi returns
 * "GMT+5", because CLDR carries no short abbreviation for it. Everyone here
 * says PKT, so it is named rather than computed, with a derived fallback for
 * any zone not in the list.
 */
const TZ_LABELS: Record<string, string> = {
  "Asia/Karachi": "PKT",
  "Asia/Dubai": "GST",
  "Asia/Kolkata": "IST",
  "Europe/London": "UK time",
  UTC: "UTC",
};

export const TZ_LABEL =
  process.env.NEXT_PUBLIC_AGENCY_TZ_LABEL ||
  TZ_LABELS[AGENCY_TZ] ||
  (() => {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: AGENCY_TZ,
        timeZoneName: "short",
      }).formatToParts(new Date());
      return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    } catch {
      return "";
    }
  })();

type Input = string | number | Date | null | undefined;

/**
 * Parses a stored value into an instant.
 *
 * The important case is a bare `YYYY-MM-DD` from a `date` column. `new
 * Date("2026-08-05")` parses that as UTC **midnight**, which in any negative
 * offset renders as the previous day — so an American client was seeing
 * 4 August on an invoice dated the 5th. Appending a time makes it local
 * midnight instead, which is stable in both directions. This is the shape
 * already used correctly at `payroll.ts:53`.
 */
function parse(value: Input): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") return new Date(value);

  const s = String(value).trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const fmt = (value: Input, opts: Intl.DateTimeFormatOptions, fallback = "—") => {
  const d = parse(value);
  if (!d) return fallback;
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: AGENCY_TZ, ...opts }).format(d);
  } catch {
    return fallback;
  }
};

/** `5 Aug 2026` */
export const fmtDate = (value: Input = new Date(), fallback = "—") =>
  fmt(value, { day: "numeric", month: "short", year: "numeric" }, fallback);

/** `05/08/2026` — for dense tables where the long form does not fit. */
export const fmtDateShort = (value: Input = new Date(), fallback = "—") =>
  fmt(value, { day: "2-digit", month: "2-digit", year: "numeric" }, fallback);

/** `Wednesday, 5 August 2026` — page headers. */
export const fmtDateLong = (value: Input = new Date(), fallback = "—") =>
  fmt(value, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, fallback);

/** `21:40 PKT` */
export function fmtTime(value: Input = new Date(), fallback = "—") {
  const t = fmt(value, { hour: "2-digit", minute: "2-digit", hour12: false }, "");
  return t ? (TZ_LABEL ? `${t} ${TZ_LABEL}` : t) : fallback;
}

/** `5 Aug 2026, 21:40 PKT` */
export function fmtDateTime(value: Input = new Date(), fallback = "—") {
  const d = parse(value);
  if (!d) return fallback;
  return `${fmtDate(d)}, ${fmtTime(d)}`;
}

/** `August 2026` */
export const fmtMonth = (value: Input = new Date(), fallback = "—") =>
  fmt(value, { month: "long", year: "numeric" }, fallback);

/** `Aug 26` — chart axes. */
export const fmtMonthShort = (value: Input = new Date(), fallback = "—") =>
  fmt(value, { month: "short", year: "2-digit" }, fallback);

/** The agency-local calendar day, as `YYYY-MM-DD`. */
export function agencyDay(value: Input = new Date()): string {
  const d = parse(value);
  if (!d) return "";
  // en-CA gives ISO order, which is what makes this comparable as a string.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AGENCY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * `Today` / `Yesterday` / `5 Aug 2026`.
 *
 * Bucketed by the agency's calendar day, not the server's. The old version
 * compared `toDateString()` on the server, so a notification raised at 9pm
 * Karachi — already the next UTC day — was headed "Yesterday" while it was
 * still happening.
 */
export function fmtDayLabel(value: Input = new Date(), fallback = "—") {
  const d = parse(value);
  if (!d) return fallback;

  const day = agencyDay(d);
  const today = agencyDay(new Date());
  if (day === today) return "Today";

  const yesterday = agencyDay(new Date(Date.now() - 864e5));
  if (day === yesterday) return "Yesterday";

  return fmtDate(d, fallback);
}

/**
 * Whole calendar days from today until a date, in the agency's zone.
 * Negative once past. Replaces `daysUntil` in utils.ts, which compared a
 * UTC midnight against the current instant — a partial-day comparison that
 * flipped depending on the time of day.
 */
export function daysUntil(value: Input): number | null {
  const d = parse(value);
  if (!d) return null;

  const target = agencyDay(d);
  const today = agencyDay(new Date());
  if (!target || !today) return null;

  const [ty, tm, td] = target.split("-").map(Number);
  const [ny, nm, nd] = today.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(ny, nm - 1, nd)) / 864e5);
}

export function humanDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const remSec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${remSec}s`;
  return `${remSec}s`;
}
