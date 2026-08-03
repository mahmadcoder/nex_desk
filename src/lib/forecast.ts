/**
 * What money is expected to arrive, and roughly when.
 *
 * Profitability looks backwards — what was collected against what it cost.
 * This looks forwards, and it is the number a small agency actually runs on:
 * a business can be profitable on paper and still not make payroll because
 * three invoices all land the week after rent.
 *
 * Everything here is derived from data the app already holds. Nothing is
 * forecast in the statistical sense and nothing is invented — every line
 * traces to a real invoice, retainer or recorded cost.
 *
 * A pure module on purpose: no React, no Supabase. The date-fallback rules
 * below are the part most likely to be wrong, and they are far easier to read
 * and change when they are not tangled up in a page.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Tier = "committed" | "scheduled" | "possible";

export type ForecastLine = {
  currency: string;
  amount: number;
  tier: Tier;
  /** null means the date is genuinely unknown — surfaced, never dropped. */
  expectedOn: string | null;
  label: string;
  sublabel?: string;
  href?: string;
  source: "invoice" | "stage" | "retainer" | "expense";
  /** Already past its due date. Not a forecast so much as a warning. */
  overdue?: boolean;
};

export type Bucket = {
  key: string;
  label: string;
  lines: ForecastLine[];
  total: number;
};

export type CurrencyForecast = {
  currency: string;
  buckets: Bucket[];
  /** Everything with a date, inside the window. */
  dated: number;
  /** Real invoices already issued and past due. */
  overdue: number;
  /** Money with no date attached — excluded from the timeline on purpose. */
  undated: number;
  total: number;
};

const DAY = 864e5;
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, n: number) =>
  new Date(new Date(iso).getTime() + n * DAY).toISOString().slice(0, 10);

/** Whole days from today. Negative means it has already passed. */
export function daysAway(iso: string): number {
  return Math.round(
    (new Date(iso).getTime() - new Date(today()).getTime()) / DAY
  );
}

/**
 * When a scheduled payment stage is likely to be invoiced.
 *
 * This is the single most important function on the page. `lockDeal` sets a
 * due date only on stage 0 unless the admin typed one into the payment
 * schedule — and the deal form seeds those blank. So MOST draft stage invoices
 * have `due_date = NULL`, and a naive `.gte("due_date", today)` would silently
 * drop the majority of the pipeline from a page whose entire job is to show it.
 *
 * Falling back through the milestone that gates the stage, then the project
 * deadline, then the agreement deadline, recovers a usable date for nearly all
 * of them. Anything still without one is reported as undated rather than
 * guessed at.
 */
export function expectedStageDate(
  invoice: any,
  milestones: any[],
  project: any | null,
  deal: any | null
): string | null {
  if (invoice.due_date) return invoice.due_date;

  // A payment stage is released by the milestone at the same position.
  if (invoice.stage_index !== null && invoice.stage_index !== undefined) {
    const gate = milestones.find(
      (m) => m.project_id === invoice.project_id && m.sort_order === invoice.stage_index
    );
    if (gate?.due_date) return gate.due_date;
  }

  return project?.deadline ?? deal?.deadline ?? null;
}

/**
 * Every renewal that falls inside the window.
 *
 * The cron advances `next_renewal_on` only after the invoice is actually
 * inserted, so a renewal is either projected here or already an invoice above
 * — never both. Starting from max(next_renewal_on, today) keeps a retainer
 * whose date has slipped into the past from projecting occurrences that have
 * already been billed.
 */
export function retainerOccurrences(deal: any, windowDays: number): string[] {
  if (!deal.next_renewal_on) return [];

  const step =
    deal.billing_cycle === "yearly" ? 12 : deal.billing_cycle === "quarterly" ? 3 : 1;

  const horizon = addDays(today(), windowDays);
  const out: string[] = [];

  let cursor = deal.next_renewal_on < today() ? today() : deal.next_renewal_on;
  const d = new Date(cursor);

  // 24 is a hard stop against a bad billing_cycle spinning forever.
  for (let i = 0; i < 24; i++) {
    cursor = d.toISOString().slice(0, 10);
    if (cursor > horizon) break;
    // A retainer that has run its course stops billing.
    if (deal.retainer_ends_on && cursor > deal.retainer_ends_on) break;
    out.push(cursor);
    d.setMonth(d.getMonth() + step);
  }

  return out;
}

const BUCKETS = [
  { key: "overdue", label: "Overdue",   from: -99999, to: -1 },
  { key: "d7",      label: "This week", from: 0,      to: 7 },
  { key: "d15",     label: "Days 8–15", from: 8,      to: 15 },
  { key: "d30",     label: "Days 16–30", from: 16,    to: 30 },
  { key: "d45",     label: "Days 31–45", from: 31,    to: 45 },
];

/**
 * Groups the lines into time buckets, per currency.
 *
 * Currencies are NEVER summed together. A forecast that converts hides the
 * exchange exposure on the very thing it is forecasting — and the rest of this
 * codebase is already strict about it.
 */
export function buildForecast(
  lines: ForecastLine[],
  windowDays = 45
): CurrencyForecast[] {
  const byCurrency = new Map<string, ForecastLine[]>();
  for (const l of lines) {
    if (!(l.amount > 0.009)) continue;
    const key = String(l.currency || "USD").toUpperCase();
    byCurrency.set(key, [...(byCurrency.get(key) ?? []), { ...l, currency: key }]);
  }

  return [...byCurrency.entries()]
    .map(([currency, all]) => {
      const undatedLines = all.filter((l) => !l.expectedOn);
      const datedLines = all.filter(
        (l) => l.expectedOn && daysAway(l.expectedOn) <= windowDays
      );

      const buckets: Bucket[] = BUCKETS.map((b) => {
        const inBucket = datedLines.filter((l) => {
          const d = daysAway(l.expectedOn!);
          return d >= b.from && d <= b.to;
        });
        return {
          key: b.key,
          label: b.label,
          lines: inBucket.sort((x, y) => (x.expectedOn! < y.expectedOn! ? -1 : 1)),
          total: inBucket.reduce((s, l) => s + l.amount, 0),
        };
      }).filter((b) => b.lines.length);

      if (undatedLines.length) {
        buckets.push({
          key: "undated",
          label: "No date yet",
          lines: undatedLines,
          total: undatedLines.reduce((s, l) => s + l.amount, 0),
        });
      }

      const overdue = buckets.find((b) => b.key === "overdue")?.total ?? 0;
      const undated = buckets.find((b) => b.key === "undated")?.total ?? 0;
      const dated = datedLines.reduce((s, l) => s + l.amount, 0);

      return { currency, buckets, dated, overdue, undated, total: dated + undated };
    })
    .sort((a, b) => b.total - a.total);
}
