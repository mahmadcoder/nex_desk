import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { COUNTRIES } from "@/lib/countries";

export const cn = (...i: ClassValue[]) => twMerge(clsx(i));

export const CURRENCIES = ["PKR", "USD", "GBP", "EUR", "AED"] as const;

/**
 * Common spellings the contact form produces that do not literally match a
 * `COUNTRIES[].name`. The country field is free text, so "USA" and "UK" arrive
 * far more often than "United States" and "United Kingdom".
 */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "United States", us: "United States", america: "United States",
  "united states of america": "United States",
  uk: "United Kingdom", britain: "United Kingdom", "great britain": "United Kingdom",
  england: "United Kingdom", scotland: "United Kingdom", wales: "United Kingdom",
  uae: "United Arab Emirates", dubai: "United Arab Emirates",
  "abu dhabi": "United Arab Emirates",
  pak: "Pakistan", pk: "Pakistan",
  ksa: "Saudi Arabia",
};

/**
 * Country → billing currency, resolved from `lib/countries.ts` so there is one
 * table of country data rather than two that can disagree.
 *
 * `clients.preferred_currency` defaults to 'PKR' in the schema and nothing ever
 * set it from the client's own country, so a lead from the USA became a client
 * billed in rupees — and `DealForm` adopts the client's currency, so the deal,
 * the invoice and the agreement PDF all inherited the mistake.
 *
 * Falls back to USD rather than PKR: anyone we cannot place is an international
 * client, and quoting them in rupees loses the deal.
 */
export function currencyForCountry(country?: string | null): string {
  const raw = (country || "").trim().toLowerCase().replace(/\./g, "");
  if (!raw) return "USD";

  const name = (COUNTRY_ALIASES[raw] ?? country ?? "").trim().toLowerCase();
  const match = COUNTRIES.find(
    (c) => c.name.toLowerCase() === name || c.code.toLowerCase() === raw
  );
  return match?.currency || "USD";
}

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

/**
 * A document title turned into a safe download filename.
 *
 * Storage keys are `<client>/<type>/<timestamp>-<type>.pdf`, so without an
 * explicit Content-Disposition the browser saves that key and the person ends
 * up with "1738312345678-agreement.pdf" on their desktop.
 */
export function pdfFilename(title: string) {
  const base = String(title)
    .replace(/[\\/:*?"<>|]/g, "")   // characters Windows refuses in a filename
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90) || "document";
  return `${base}.pdf`;
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

/**
 * The agency WhatsApp number, shown wherever a client might need to send us
 * something. Clients routinely send receipts and signed pages on WhatsApp
 * rather than by email, so every document-related email offers it as a route.
 *
 * Editable in Settings; this is the fallback when that row is unset.
 */
export const CONTACT_WHATSAPP =
  process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || "+92 302 6101761";

/**
 * Makes a user-typed address safe to put in an href.
 *
 * Someone typing "physicianmeds.com" into the staging or live URL field is
 * writing a RELATIVE path as far as the browser is concerned, so the link
 * resolved to `nex-desk-tech.vercel.app/physicianmeds.com` — our domain, not
 * the client's. Anything without a scheme gets https://.
 *
 * Returns null for empty input so callers can skip rendering the link at all,
 * and refuses `javascript:` and `data:` outright — these fields are typed by
 * an admin but rendered to clients.
 */
export function externalUrl(raw?: string | null): string | null {
  const v = (raw || "").trim();
  if (!v) return null;

  if (/^(javascript|data|vbscript):/i.test(v)) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("//")) return `https:${v}`;
  return `https://${v.replace(/^\/+/, "")}`;
}

/** `wa.me` deep link — digits only, no plus, no spaces. */
export function whatsappLink(number: string = CONTACT_WHATSAPP, message?: string) {
  const digits = String(number).replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

/**
 * Whole days from now until a date, or null if there isn't one. Negative once
 * the date has passed.
 *
 * Re-exported from `lib/datetime` so the many existing importers keep working.
 * The old implementation here compared a UTC midnight against the current
 * instant — a partial-day comparison, so "renews in 30 days" became 29 as the
 * afternoon wore on. The version behind this counts whole calendar days in the
 * agency's own timezone.
 */
export { daysUntil } from "@/lib/datetime";

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
