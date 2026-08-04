import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Stat, Table, Empty } from "@/components/admin/ui";
import { money } from "@/lib/utils";
import { getLiveExchangeRates, convertCurrency } from "@/lib/currency";
import { TrendingUp, TrendingDown, Info } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "Profitability" };
export const dynamic = "force-dynamic";

/**
 * Which projects — and which kinds of work — actually make money.
 *
 * Everything here is derived from data the app already collects: salaries,
 * hours logged per project per person, and payments received. Nobody fills
 * anything in for this page to work.
 *
 * Cost model: a monthly salary over 26 working days (Mon–Sat) × 8 hours =
 * salary / 208 per hour. Cross-currency figures use the live FX table with
 * built-in fallbacks, so treat margins as honest estimates, not accounting.
 */
export default async function ProfitPage() {
  const me = await getCurrentStaff();
  // Money-per-hour per employee is exactly what staff must never see.
  if (!me?.isPrivileged) return null;

  const db = createAdminClient();

  const [{ data: projects }, { data: logs }, { data: employees }, { data: invoices }, rates] =
    await Promise.all([
      db.from("projects").select("id, name, status, client_id, clients(name), deals(total, currency)"),
      db.from("daily_work_logs").select("project_id, employee_id, hours_spent"),
      db.from("employees").select("id, full_name, salary_amount, salary_currency"),
      db.from("invoices").select("project_id, amount_paid, currency"),
      getLiveExchangeRates(),
    ]);

  // Money that actually left the account for this project — a domain, a
  // licence, ad spend. Without it a $200 domain rebilled at $200 shows as
  // $200 of pure profit, which is the opposite of the truth.
  const { data: outlays, error: outlayErr } = await db
    .from("project_expenses")
    .select("project_id, cost, bill_amount, currency, status");
  if (outlayErr) {
    console.error("Profitability: could not load expenses", outlayErr);
  }

  // Expenses with no project attached cannot be charged to any one row; they
  // are surfaced separately rather than silently dropped.
  const unattributed = (outlays ?? []).filter((x) => !x.project_id);

  const HOURS_PER_MONTH = 26 * 8;
  const rateOf = new Map(
    (employees ?? []).map((e) => [
      e.id,
      {
        name: e.full_name,
        hourly: Number(e.salary_amount || 0) / HOURS_PER_MONTH,
        currency: e.salary_currency || "USD",
      },
    ])
  );

  const rows = (projects ?? [])
    .map((p: any) => {
      const currency: string = p.deals?.currency || "USD";

      const revenue = (invoices ?? [])
        .filter((i) => i.project_id === p.id)
        .reduce(
          (s, i) => s + convertCurrency(Number(i.amount_paid || 0), i.currency || currency, currency, rates),
          0
        );

      let hours = 0;
      let cost = 0;
      const who = new Map<string, number>();
      for (const l of (logs ?? []).filter((l) => l.project_id === p.id)) {
        const h = Number(l.hours_spent || 0);
        hours += h;
        const r = l.employee_id ? rateOf.get(l.employee_id) : null;
        if (r && r.hourly > 0) {
          cost += convertCurrency(h * r.hourly, r.currency, currency, rates);
          who.set(r.name, (who.get(r.name) ?? 0) + h);
        }
      }

      const outlay = (outlays ?? [])
        .filter((x) => x.project_id === p.id)
        .reduce(
          (s, x) => s + convertCurrency(Number(x.cost || 0), x.currency || currency, currency, rates),
          0
        );

      const totalCost = cost + outlay;
      const margin = revenue - totalCost;
      return {
        id: p.id,
        name: p.name,
        client: p.clients?.name ?? "—",
        clientId: p.client_id,
        status: String(p.status).replace(/_/g, " "),
        currency,
        contract: Number(p.deals?.total || 0),
        revenue,
        hours,
        labour: cost,
        outlay,
        cost: totalCost,
        margin,
        marginPct: revenue > 0 ? Math.round((margin / revenue) * 100) : null,
        team: [...who.entries()].map(([n, h]) => `${n} ${h.toFixed(0)}h`).join(", "),
      };
    })
    // Projects with neither money, hours nor spend are noise here.
    .filter((r) => r.revenue > 0 || r.hours > 0 || r.outlay > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // Portfolio totals only make sense inside one currency; group rather than sum.
  const byCurrency = new Map<string, { revenue: number; cost: number }>();
  for (const r of rows) {
    const t = byCurrency.get(r.currency) ?? { revenue: 0, cost: 0 };
    t.revenue += r.revenue;
    t.cost += r.cost;
    byCurrency.set(r.currency, t);
  }
  const totals = [...byCurrency.entries()];

  return (
    <>
      <PageHead
        title="Profitability"
        sub="Payments received vs what the logged hours cost in salary. Estimates, not accounting — but honest ones."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Collected"
          value={totals.map(([c, t]) => money(t.revenue, c)).join(" · ") || "—"}
          tone="good"
        />
        <Stat
          label="What it cost to deliver"
          value={totals.map(([c, t]) => money(t.cost, c)).join(" · ") || "—"}
        />
        <Stat
          label="Margin"
          value={totals.map(([c, t]) => money(t.revenue - t.cost, c)).join(" · ") || "—"}
          tone={totals.every(([, t]) => t.revenue - t.cost >= 0) ? "good" : "warn"}
        />
      </div>

      <div className="mt-8">
        {!rows.length ? (
          <Empty
            title="Nothing to measure yet"
            body="This page fills itself in from payments and daily work logs. Once staff log hours against projects with money on them, the margins appear."
          />
        ) : (
          <Table head={["Project", "Client", "Collected", "Hours", "Cost", "Margin", ""]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-ink-700/30">
                <td className="px-5 py-3">
                  <Link href={`${BASE}/projects/${r.id}`} className="font-medium hover:text-lime-400">
                    {r.name}
                  </Link>
                  {r.team && <p className="mono-tag mt-0.5 text-[11px]">{r.team}</p>}
                </td>
                <td className="px-5 py-3 text-bone-300">
                  <Link href={`${BASE}/clients/${r.clientId}`} className="hover:text-lime-400">
                    {r.client}
                  </Link>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{money(r.revenue, r.currency)}</td>
                <td className="px-5 py-3 font-mono text-xs text-bone-300">{r.hours.toFixed(1)}</td>
                <td className="px-5 py-3 font-mono text-xs text-bone-300">
                  {money(r.cost, r.currency)}
                  {/* Split it out only when there is spend to split, so the
                      common labour-only row stays clean. */}
                  {r.outlay > 0 && (
                    <span className="mt-0.5 block text-[10px] text-bone-400">
                      {money(r.labour, r.currency)} labour + {money(r.outlay, r.currency)} bought
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center gap-1 font-mono text-xs ${
                      r.margin >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {r.margin >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {money(r.margin, r.currency)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {r.marginPct !== null && (
                    <span
                      className={`mono-tag rounded-full border px-2 py-0.5 text-[10px] leading-none ${
                        r.marginPct >= 50
                          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                          : r.marginPct >= 20
                            ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                            : "border-rose-400/40 bg-rose-400/10 text-rose-300"
                      }`}
                    >
                      {r.marginPct}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-bone-300">
        Cost = labour + outlay. Labour is each person&rsquo;s monthly salary ÷ 208 hours (26
        working days × 8) times the hours they logged, converted at live rates. Outlay is what
        was actually paid for domains, hosting, licences and ad spend recorded against the
        project. Hours logged with no salary on file cost nothing here — set salaries on the
        employee profiles to make this true.
      </p>

      {/* The counterpart of the banner on the books page. Someone comparing
          the two numbers and finding they disagree should find the reason
          here rather than assuming one of them is broken. */}
      <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-ink-600 bg-ink-800/50 p-4">
        <Info size={15} className="mt-0.5 shrink-0 text-bone-400" />
        <p className="text-[11px] leading-relaxed text-bone-300">
          <strong className="text-bone-100">This is an estimate, not your bank balance.</strong>{" "}
          Labour here is salary spread over logged hours, so it will not match what you actually
          paid anyone — somebody logging few hours has only part of their salary charged, and
          somebody logging many has more than all of it.{" "}
          <Link href={`${BASE}/books`} className="text-lime-400 hover:underline">
            Money In &amp; Out
          </Link>{" "}
          has the real cash. The two answer different questions and must not be added together.
        </p>
      </div>

      {unattributed.length > 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-300/90">
          {unattributed.length} recorded cost{unattributed.length === 1 ? " is" : "s are"} not
          attached to any project, so {unattributed.length === 1 ? "it is" : "they are"} not in
          the margins above. Open the client and set a project on{" "}
          {unattributed.length === 1 ? "it" : "them"} to count {unattributed.length === 1 ? "it" : "them"}.
        </p>
      )}
    </>
  );
}
