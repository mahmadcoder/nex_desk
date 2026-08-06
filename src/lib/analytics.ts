import { createAdminClient } from "@/lib/supabase/server";
import { expenseInvoiceIds } from "@/lib/billing";
import { sumByCurrency } from "@/lib/utils";
import { monthsBetween, type Range } from "@/lib/dates";
import { PLATFORMS } from "@/config/platforms";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The figures behind /nx-control/insights.
 *
 * Server-only, one function per panel, each scoped to a date range. Two house
 * rules are load-bearing here:
 *
 *   • Currencies are never added together. Every money figure is grouped per
 *     currency, the same way books, profit and the dashboard do it.
 *   • Purchase re-bills are not revenue. A domain bought at $110 and re-billed
 *     at $150 is mostly money passing through to a registrar; both halves live
 *     on the Purchases page. `expenseInvoiceIds` is how every other money
 *     surface excludes them, and this one does the same.
 */

const KNOWN_SOURCES = new Set(PLATFORMS.map((p) => p.id));

/** Folds a free-text source into a known bucket. */
export function sourceKey(raw?: string | null): string {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return "website"; // the column default
  return KNOWN_SOURCES.has(v) ? v : "other";
}

export function sourceLabel(key: string): string {
  return PLATFORMS.find((p) => p.id === key)?.label ?? "Other";
}

export type SourceRow = {
  key: string;
  label: string;
  clients: number;
  /** Per currency — never summed. */
  revenue: Array<{ currency: string; total: number }>;
};

/**
 * Where clients came from, and what each source actually paid.
 *
 * The count on its own misleads: five Fiverr clients at $200 look better than
 * one referral at $5,000 until the money is next to them. That is the whole
 * reason this returns both.
 */
export async function clientsBySource({ from, to }: Range): Promise<SourceRow[]> {
  const db = createAdminClient();

  const [{ data: clients }, { data: payments }, { data: purchases }] = await Promise.all([
    db
      .from("clients")
      .select("id, source, created_at")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`),
    // Payments are NOT range-filtered by the client's join date — a client won
    // last year who paid this month is this month's revenue.
    db.from("payments").select("client_id, invoice_id, amount, currency, paid_on")
      .gte("paid_on", from).lte("paid_on", to),
    db.from("project_expenses").select("invoice_id").not("invoice_id", "is", null),
  ]);

  // Every client, not just the ones won in range — a payment has to be
  // attributable to a source even when the client predates the window.
  const { data: allClients } = await db.from("clients").select("id, source");
  const sourceOf = new Map<string, string>(
    (allClients ?? []).map((c: any) => [c.id, sourceKey(c.source)])
  );

  const purchaseInvoices = expenseInvoiceIds(purchases ?? []);
  const trading = (payments ?? []).filter(
    (p: any) => !p.invoice_id || !purchaseInvoices.has(p.invoice_id)
  );

  const counts = new Map<string, number>();
  for (const c of clients ?? []) {
    const k = sourceKey((c as any).source);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const paidBySource = new Map<string, any[]>();
  for (const p of trading) {
    const k = sourceOf.get((p as any).client_id) ?? "other";
    if (!paidBySource.has(k)) paidBySource.set(k, []);
    paidBySource.get(k)!.push(p);
  }

  const keys = new Set<string>([...counts.keys(), ...paidBySource.keys()]);

  return [...keys]
    .map((key) => ({
      key,
      label: sourceLabel(key),
      clients: counts.get(key) ?? 0,
      revenue: sumByCurrency(
        paidBySource.get(key) ?? [],
        (p: any) => p.currency,
        (p: any) => Number(p.amount)
      ),
    }))
    .sort((a, b) => {
      const av = a.revenue[0]?.total ?? 0;
      const bv = b.revenue[0]?.total ?? 0;
      return bv - av || b.clients - a.clients;
    });
}

export type MonthPoint = { month: string; clients: number; revenue: Record<string, number> };

/**
 * New clients and cash collected, by month across the range.
 *
 * Returned together but charted separately — two measures on two scales share
 * an x-axis, never a y-axis.
 */
export async function overTime(range: Range): Promise<{
  months: MonthPoint[];
  currencies: string[];
}> {
  const db = createAdminClient();
  const { from, to } = range;

  const [{ data: clients }, { data: payments }, { data: purchases }] = await Promise.all([
    db.from("clients").select("created_at")
      .gte("created_at", `${from}T00:00:00`).lte("created_at", `${to}T23:59:59`),
    db.from("payments").select("invoice_id, amount, currency, paid_on")
      .gte("paid_on", from).lte("paid_on", to),
    db.from("project_expenses").select("invoice_id").not("invoice_id", "is", null),
  ]);

  const purchaseInvoices = expenseInvoiceIds(purchases ?? []);
  const trading = (payments ?? []).filter(
    (p: any) => !p.invoice_id || !purchaseInvoices.has(p.invoice_id)
  );

  const months = monthsBetween(range);
  const blank = () => Object.fromEntries(months.map((m) => [m, 0])) as Record<string, number>;

  const clientCounts = blank();
  for (const c of clients ?? []) {
    const m = String((c as any).created_at).slice(0, 7);
    if (m in clientCounts) clientCounts[m] += 1;
  }

  const currencies = [...new Set(trading.map((p: any) => String(p.currency || "PKR").toUpperCase()))].sort();
  const byCurrency: Record<string, Record<string, number>> = {};
  for (const cur of currencies) byCurrency[cur] = blank();

  for (const p of trading) {
    const cur = String((p as any).currency || "PKR").toUpperCase();
    const m = String((p as any).paid_on).slice(0, 7);
    if (byCurrency[cur] && m in byCurrency[cur]) {
      byCurrency[cur][m] += Number((p as any).amount) || 0;
    }
  }

  return {
    months: months.map((month) => ({
      month,
      clients: clientCounts[month] ?? 0,
      revenue: Object.fromEntries(currencies.map((c) => [c, byCurrency[c][month] ?? 0])),
    })),
    currencies,
  };
}

export type DeliveryStats = {
  delivered: number;
  medianDays: number | null;
  onTime: number;
  late: number;
  onTimeRate: number | null;
  byMonth: Array<{ month: string; delivered: number }>;
};

/**
 * Whether the agency actually delivers on time.
 *
 * `start_date`, `deadline` and `handed_over_at` sit on every project and
 * nothing has ever read them together, so this question has been unanswerable.
 *
 * Median rather than mean: one project that dragged for eight months would
 * drag a mean with it and describe nothing typical.
 */
export async function deliveryStats(range: Range): Promise<DeliveryStats> {
  const db = createAdminClient();
  const { from, to } = range;

  const { data: projects } = await db
    .from("projects")
    .select("id, start_date, deadline, handed_over_at")
    .not("handed_over_at", "is", null)
    .gte("handed_over_at", `${from}T00:00:00`)
    .lte("handed_over_at", `${to}T23:59:59`);

  const rows = projects ?? [];
  const months = monthsBetween(range);
  const perMonth = Object.fromEntries(months.map((m) => [m, 0])) as Record<string, number>;

  const durations: number[] = [];
  let onTime = 0;
  let late = 0;

  for (const p of rows as any[]) {
    const handed = String(p.handed_over_at).slice(0, 10);
    const m = handed.slice(0, 7);
    if (m in perMonth) perMonth[m] += 1;

    if (p.start_date) {
      const days = Math.round(
        (new Date(handed).getTime() - new Date(p.start_date).getTime()) / 864e5
      );
      if (days >= 0) durations.push(days);
    }

    // Only projects that had a deadline can be judged against one.
    if (p.deadline) {
      if (handed <= String(p.deadline)) onTime += 1;
      else late += 1;
    }
  }

  durations.sort((a, b) => a - b);
  const mid = Math.floor(durations.length / 2);
  const medianDays = durations.length
    ? durations.length % 2
      ? durations[mid]
      : Math.round((durations[mid - 1] + durations[mid]) / 2)
    : null;

  const judged = onTime + late;

  return {
    delivered: rows.length,
    medianDays,
    onTime,
    late,
    // Below three judged projects a percentage is noise dressed as a number —
    // the same restraint pipelineStats applies to its close rate.
    onTimeRate: judged >= 3 ? Math.round((onTime / judged) * 100) : null,
    byMonth: months.map((month) => ({ month, delivered: perMonth[month] ?? 0 })),
  };
}

export type PipelineStats = {
  quoted: number;
  won: number;
  lost: number;
  closeRate: number | null;
  avgDaysToClose: number | null;
};

/**
 * Quotes in, deals out.
 *
 * A range-scoped version of `pipelineStats` in actions/quotes.ts, which is
 * fixed to 365 days and guarded by `requireOwnerAdmin`. Kept separate rather
 * than changing that one's signature, because the Deals page depends on its
 * current behaviour.
 */
export async function pipelineInRange({ from, to }: Range): Promise<PipelineStats> {
  const db = createAdminClient();

  const [{ data: quoted }, { data: won }, { data: lost }] = await Promise.all([
    db.from("deals").select("id")
      .not("quote_sent_at", "is", null)
      .gte("quote_sent_at", `${from}T00:00:00`).lte("quote_sent_at", `${to}T23:59:59`),
    db.from("deals").select("id, locked_at, quote_sent_at")
      .eq("status", "locked")
      .not("locked_at", "is", null)
      .gte("locked_at", `${from}T00:00:00`).lte("locked_at", `${to}T23:59:59`),
    db.from("deals").select("id")
      .not("lost_at", "is", null)
      .gte("lost_at", `${from}T00:00:00`).lte("lost_at", `${to}T23:59:59`),
  ]);

  const wonRows = won ?? [];
  const wonCount = wonRows.length;
  const lostCount = (lost ?? []).length;
  const closed = wonCount + lostCount;

  const gaps = wonRows
    .filter((d: any) => d.quote_sent_at)
    .map((d: any) =>
      Math.round(
        (new Date(d.locked_at).getTime() - new Date(d.quote_sent_at).getTime()) / 864e5
      )
    )
    .filter((n: number) => n >= 0);

  return {
    quoted: (quoted ?? []).length,
    won: wonCount,
    lost: lostCount,
    // Under five closed deals a close rate is a rumour. Matching the rule the
    // existing pipelineStats already applies rather than inventing a new one.
    closeRate: closed >= 5 ? Math.round((wonCount / closed) * 100) : null,
    avgDaysToClose: gaps.length
      ? Math.round(gaps.reduce((s: number, n: number) => s + n, 0) / gaps.length)
      : null,
  };
}
