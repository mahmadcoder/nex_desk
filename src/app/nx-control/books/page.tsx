import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Stat } from "@/components/admin/ui";
import { money, moneyMulti, sumByCurrency, cn } from "@/lib/utils";
import { getLiveExchangeRates, convertCurrency } from "@/lib/currency";
import { mergeTotals, expenseInvoiceIds, type Money } from "@/lib/billing";
// Shared with Insights, which needs the same three. Were private here.
import { monthRange, shiftMonth, monthLabel } from "@/lib/dates";
import { ArrowDownLeft, ArrowUpRight, Info, ChevronLeft, ChevronRight } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "Money In & Out" };
export const dynamic = "force-dynamic";


/**
 * Real cash, both directions, for one month.
 *
 * This is NOT the Profitability page and the two must never be added together.
 * Profitability answers "which work is worth doing" and estimates salary per
 * project as `salary ÷ 208 × hours logged`. This answers "what did we actually
 * keep" and uses the salary payments actually recorded. The same salary appears
 * in both, at completely different values — someone logging 120 hours has ~58%
 * of their pay charged to projects, someone logging 250 hours has ~120%. Both
 * pages carry a banner saying so.
 */
export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const me = await getCurrentStaff();
  // The whole commercial position, including what every person is paid.
  if (!me?.isPrivileged) return null;

  const { m } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(m ?? "") ? m! : new Date().toISOString().slice(0, 7);
  const { from, to } = monthRange(month);

  const db = createAdminClient();

  const [
    { data: payments },
    { data: salaries, error: salaryErr },
    { data: agency, error: agencyErr },
    { data: purchases },
    { data: refunds },
    rates,
  ] = await Promise.all([
    db.from("payments").select("amount, fee, currency, paid_on, invoice_id").gte("paid_on", from).lte("paid_on", to),
    db.from("salary_payments")
      .select("amount, currency, paid_on, employees(full_name)")
      .gte("paid_on", from).lte("paid_on", to),
    db.from("agency_expenses")
      .select("amount, currency, incurred_on, label, category")
      .gte("incurred_on", from).lte("incurred_on", to),
    // Loaded only to identify which invoices were purchase re-bills, so the
    // payments against them can be excluded from Money In. The costs
    // themselves are NOT counted here — purchases live on their own page,
    // deliberately kept out of this one on both sides.
    db.from("project_expenses").select("invoice_id, currency, incurred_on"),
    db.from("projects")
      .select("name, refund_amount, refund_fee, refund_currency, refunded_at")
      .not("refunded_at", "is", null)
      .gte("refunded_at", `${from}T00:00:00`).lte("refunded_at", `${to}T23:59:59`),
    getLiveExchangeRates(),
  ]);

  if (salaryErr) console.error("Books: salary_payments unavailable", salaryErr);
  if (agencyErr) console.error("Books: agency_expenses unavailable", agencyErr);

  /* ---------- IN ---------------------------------------------------- */
  // Payments settling a purchase re-bill are excluded. Purchases are held
  // entirely on their own page — both the cost and the client's payment — so
  // counting the income here while the cost sits elsewhere would overstate
  // this month by the full purchase price.
  const purchaseInvoices = expenseInvoiceIds(purchases ?? []);
  const tradingPayments = (payments ?? []).filter(
    (p: any) => !p.invoice_id || !purchaseInvoices.has(p.invoice_id)
  );

  const received = sumByCurrency(tradingPayments, (p: any) => p.currency, (p: any) => Number(p.amount));
  // Bank charges reduce what arrived; they are not a separate expense line.
  // That is exactly what `payments.fee` records, and booking it twice — once
  // here and once as a cost — would overstate outgoings.
  const bankCharges = sumByCurrency(tradingPayments, (p: any) => p.currency, (p: any) => Number(p.fee || 0));
  const netIn = mergeTotals(
    received,
    bankCharges.map((t) => ({ ...t, total: -t.total }))
  );

  /* ---------- OUT --------------------------------------------------- */
  const salaryOut = sumByCurrency(salaries ?? [], (s: any) => s.currency, (s: any) => Number(s.amount));
  const agencyOut = sumByCurrency(agency ?? [], (a: any) => a.currency, (a: any) => Number(a.amount));
  const refundOut = sumByCurrency(
    refunds ?? [],
    (r: any) => r.refund_currency || "USD",
    (r: any) => Number(r.refund_amount || 0) + Number(r.refund_fee || 0)
  );

  const totalOut = mergeTotals(mergeTotals(salaryOut, agencyOut), refundOut);
  const left = mergeTotals(netIn, totalOut.map((t) => ({ ...t, total: -t.total })));

  /* ---------- One combined figure, clearly caveated ------------------ */
  const BASE_CCY = "USD";
  const toBase = (rows: Money) =>
    rows.reduce((s, t) => s + convertCurrency(t.total, t.currency, BASE_CCY, rates), 0);

  const combinedIn = toBase(netIn);
  const combinedOut = toBase(totalOut);
  const combinedLeft = combinedIn - combinedOut;
  const multiCurrency =
    new Set([...netIn, ...totalOut].map((t) => t.currency)).size > 1;

  const outRows: Array<{ label: string; totals: Money; href?: string; note?: string }> = [
    { label: "Salaries paid", totals: salaryOut, href: `${BASE}/employees`, note: "What actually left the account, not an estimate." },
    { label: "Agency expenses", totals: agencyOut, href: `${BASE}/expenses`, note: "Tools, subscriptions, hardware, office." },
    { label: "Refunds sent", totals: refundOut, note: "Including the transfer fee." },
  ].filter((r) => r.totals.length);

  return (
    <>
      <PageHead
        title="Money In & Out"
        sub="Real cash for one month — what came in, what went out, what is left."
      />

      {/* Month picker */}
      <div className="mb-6 flex items-center gap-2">
        <Link
          href={`${BASE}/books?m=${shiftMonth(month, -1)}`}
          className="btn btn-sm gap-1"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} />
        </Link>
        <span className="min-w-[10rem] text-center text-sm font-medium text-bone-100">
          {monthLabel(month)}
        </span>
        <Link
          href={`${BASE}/books?m=${shiftMonth(month, 1)}`}
          className="btn btn-sm gap-1"
          aria-label="Next month"
        >
          <ChevronRight size={14} />
        </Link>
        {month !== new Date().toISOString().slice(0, 7) && (
          <Link href={`${BASE}/books`} className="mono-tag text-[11px] hover:text-lime-400">
            this month
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Money in" value={moneyMulti(netIn, "—")} tone="good" hint="After bank charges" />
        <Stat label="Money out" value={moneyMulti(totalOut, "—")} hint="Salaries, tools, refunds" />
        <Stat
          label="What's left"
          value={moneyMulti(left, "—")}
          tone={left.every((t) => t.total >= 0) ? "good" : "warn"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* ── IN ── */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ink-600 bg-ink-700/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-base">
              <ArrowDownLeft size={15} className="text-lime-400" /> Money in
            </h2>
            <p className="font-mono text-sm text-lime-400">{moneyMulti(netIn, "—")}</p>
          </div>
          <div className="divide-y divide-ink-700">
            <Row label="Client payments received" totals={received} href={`${BASE}/invoices`} />
            {!!bankCharges.length && (
              <Row
                label="Less bank charges"
                totals={bankCharges.map((t) => ({ ...t, total: -t.total }))}
                note="Taken before the money reached you. Recorded per payment."
              />
            )}
            {!tradingPayments.length && (
              <p className="px-5 py-6 text-center text-sm text-bone-300">
                No payments received in {monthLabel(month)}.
              </p>
            )}
          </div>
        </section>

        {/* ── OUT ── */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ink-600 bg-ink-700/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-base">
              <ArrowUpRight size={15} className="text-amber-400" /> Money out
            </h2>
            <p className="font-mono text-sm text-bone-100">{moneyMulti(totalOut, "—")}</p>
          </div>
          <div className="divide-y divide-ink-700">
            {outRows.map((r) => (
              <Row key={r.label} label={r.label} totals={r.totals} href={r.href} note={r.note} />
            ))}
            {!outRows.length && (
              <p className="px-5 py-6 text-center text-sm text-bone-300">
                Nothing recorded going out in {monthLabel(month)}.
              </p>
            )}
          </div>
        </section>
      </div>

      {multiCurrency && (
        <div className="mt-6 rounded-lg border border-ink-600 bg-ink-800/50 p-4">
          <p className="mono-tag text-[11px]">Roughly, in one number</p>
          <p className="mt-1 font-mono text-lg text-bone-50">
            {money(combinedIn, BASE_CCY)} in · {money(combinedOut, BASE_CCY)} out ·{" "}
            <span className={combinedLeft >= 0 ? "text-lime-400" : "text-rose-300"}>
              {money(combinedLeft, BASE_CCY)} left
            </span>
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-bone-400">
            Converted at today&rsquo;s rate, which is not the rate you actually got. The
            per-currency figures above are the real ones — this line is for a quick sense of
            scale, not for your accounts.
          </p>
        </div>
      )}

      {/* The whole reason this page exists separately. */}
      <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-ink-600 bg-ink-800/50 p-4">
        <Info size={15} className="mt-0.5 shrink-0 text-bone-400" />
        <p className="text-[11px] leading-relaxed text-bone-300">
          <strong className="text-bone-100">Do not add this to Profitability.</strong>{" "}
          <Link href={`${BASE}/profit`} className="text-lime-400 hover:underline">
            Profitability
          </Link>{" "}
          answers <em>which work is worth doing</em> and estimates each person&rsquo;s cost per
          project from their salary and the hours they logged. This page answers{" "}
          <em>what did we actually keep</em> and uses the payments you really made. The same
          salary appears in both at different values, on purpose — they are two questions, and
          adding them together means nothing.
          <br /><br />
          Purchases made on clients&rsquo; behalf are left out of this page entirely — both what
          they cost and what the client paid for them — and are tracked on{" "}
          <Link href={`${BASE}/purchases`} className="text-lime-400 hover:underline">Purchases</Link>.
          So this will not tie out to your bank statement by exactly that amount.
        </p>
      </div>
    </>
  );
}

function Row({
  label, totals, href, note,
}: {
  label: string;
  totals: Money;
  href?: string;
  note?: string;
}) {
  if (!totals.length) return null;
  const negative = totals.every((t) => t.total < 0);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
      <div className="min-w-0">
        {href ? (
          <Link href={href} className="text-sm text-bone-200 hover:text-lime-400">
            {label}
          </Link>
        ) : (
          <p className="text-sm text-bone-200">{label}</p>
        )}
        {note && <p className="mt-0.5 text-[11px] leading-relaxed text-bone-400">{note}</p>}
      </div>
      <p className={cn("shrink-0 font-mono text-sm", negative ? "text-rose-300" : "text-bone-100")}>
        {moneyMulti(totals.map((t) => ({ ...t, total: Math.abs(t.total) })))}
      </p>
    </div>
  );
}
