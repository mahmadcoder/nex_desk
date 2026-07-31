import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...i: ClassValue[]) => twMerge(clsx(i));

export const CURRENCIES = ["PKR", "USD", "GBP", "EUR", "AED"] as const;

/**
 * The lead pipeline, in order. One list, used by the leads board, the row
 * status picker and the counts — they were three separate literals, so adding
 * `spam` to one of them would have left the others silently out of step.
 *
 * `spam` must also exist in the `lead_status` enum
 * (supabase/idempotent_fixes_2026_08.sql).
 */
export const LEAD_STATUSES = ["new", "contacted", "quoted", "won", "lost", "spam"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Statuses that count as live pipeline. Spam is noise, not a lead. */
export const ACTIVE_LEAD_STATUSES = LEAD_STATUSES.filter((s) => s !== "spam");

const SYMBOL: Record<string, string> = {
  PKR: "Rs", USD: "$", GBP: "£", EUR: "€", AED: "AED",
};

/**
 * The one currency formatter. `lib/pdf/parts.ts` re-exports this as `fmt`.
 *
 * There used to be two: `money()` defaulting to USD for the screen and `fmt()`
 * defaulting to PKR for PDFs, with different spacing. Any record that lost its
 * currency therefore rendered as "$1,000" on screen and "Rs 1,000" in the
 * attached document — the same figure, two currencies.
 *
 * There is no default now: callers must say which currency they mean, and an
 * unknown code prints as the code itself rather than guessing a symbol.
 */
export function money(amount: number, currency: string | null | undefined) {
  const code = (currency || "").toUpperCase();
  const symbol = SYMBOL[code];
  const value = Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return symbol ? `${symbol}${value}` : `${code || "?"} ${value}`.trim();
}

/**
 * Groups amounts by their own currency.
 *
 * Totals must never be summed across currencies — adding a USD invoice to a PKR
 * one produces a meaningless number that then gets labelled with whichever
 * currency happened to come first.
 */
export function sumByCurrency<T>(
  rows: T[],
  currencyOf: (row: T) => string | null | undefined,
  amountOf: (row: T) => number
): Array<{ currency: string; total: number }> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const code = (currencyOf(row) || "").toUpperCase() || "PKR";
    totals.set(code, (totals.get(code) ?? 0) + Number(amountOf(row) || 0));
  }
  return [...totals.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => b.total - a.total);
}

/** Renders per-currency totals as "$4,200 · Rs180,000". Never adds them together. */
export function moneyMulti(
  totals: Array<{ currency: string; total: number }>,
  emptyLabel = "—"
) {
  if (!totals.length) return emptyLabel;
  return totals.map((t) => money(t.total, t.currency)).join(" · ");
}

/** Replaces {{variables}} in an email template body. */
export function fillTemplate(text: string, vars: Record<string, string | number>) {
  return text.replace(/\{\{(\w+)\}\}/g, (m, k) =>
    vars[k] !== undefined ? String(vars[k]) : m
  );
}

/**
 * The public contact address shown on the site, portal and documents.
 * Safe to use from client components; override with NEXT_PUBLIC_CONTACT_EMAIL.
 * Internal notification routing is separate — see `adminNotifyAddress()`.
 */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "ahmadsadiq.dev@gmail.com";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns the value only if it is a valid UUID, otherwise null.
 * Guards `uuid` columns against free-text input, which Postgres rejects with
 * 22P02 and which surfaces as an opaque 500 from a server action.
 */
export const asUuid = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return UUID_RE.test(s) ? s : null;
};

export const adminPath = (sub = "") =>
  `/${process.env.NEXT_PUBLIC_ADMIN_PATH || "nx-control"}${sub}`;

/** Returns the canonical site base URL, ensuring the primary public domain (https://nex-desk-tech.vercel.app) is used instead of Vercel preview deployment URLs. */
export function getSiteBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  // Public production domain fallback
  return "https://nex-desk-tech.vercel.app";
}
