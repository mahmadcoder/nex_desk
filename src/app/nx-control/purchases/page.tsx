import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Stat, Empty, Badge } from "@/components/admin/ui";
import { money, moneyMulti, sumByCurrency } from "@/lib/utils";
import { expenseCategoryLabel } from "@/config/expenseCategories";
import { ShoppingBag, FileText, Lock } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "Purchases" };
export const dynamic = "force-dynamic";

/**
 * Things bought for clients, and what was kept on them.
 *
 * These deliberately appear nowhere else. Profitability and Money In & Out
 * both exclude purchases entirely — on BOTH sides, the cost and the client's
 * payment — so those pages measure the agency's own service work and this one
 * holds the reselling side on its own.
 *
 * The consequence is stated on all three pages rather than left to be
 * discovered: the two money pages no longer reconcile to the bank by exactly
 * the margin shown here.
 *
 * Change requests are NOT here. Extra work a client agreed to buy is ordinary
 * contract revenue and appears everywhere, as it should.
 */
export default async function PurchasesPage() {
  const me = await getCurrentStaff();
  // The markup is the whole point of this page being separate.
  if (!me?.isPrivileged) return null;

  const db = createAdminClient();

  const { data: rows, error } = await db
    .from("project_expenses")
    .select("*, clients(id, name, company), projects(id, name)")
    .order("incurred_on", { ascending: false });

  if (error) {
    console.error("Purchases: could not load project_expenses", error);
  }

  const all = rows ?? [];

  // Only what has actually been billed counts as money in. An absorbed cost is
  // real spend with nothing charged against it, and it should drag the kept
  // figure down rather than being quietly left out.
  const charged = all.filter((x: any) => Number(x.bill_amount) > 0);

  const billed = sumByCurrency(charged, (x: any) => x.currency, (x: any) => Number(x.bill_amount));
  const cost = sumByCurrency(all, (x: any) => x.currency, (x: any) => Number(x.cost || 0));

  const costBy = new Map<string, number>(cost.map((t) => [t.currency, t.total] as const));
  const kept = billed
    .map((t) => ({ currency: t.currency, total: t.total - (costBy.get(t.currency) ?? 0) }))
    .filter((t) => Math.abs(t.total) > 0.009);

  const absorbed = all.filter((x: any) => !(Number(x.bill_amount) > 0));

  // Grouped by client, biggest spend first — the question is nearly always
  // "how much have we laid out for this one".
  const byClient = new Map<string, { client: any; items: any[] }>();
  for (const x of all) {
    const c = (x.clients as any) ?? { id: x.client_id, name: "Unknown client" };
    const entry = byClient.get(c.id) ?? { client: c, items: [] };
    entry.items.push(x);
    byClient.set(c.id, entry);
  }

  const groups = [...byClient.values()].sort(
    (a, b) =>
      b.items.reduce((s, x) => s + Number(x.cost || 0), 0) -
      a.items.reduce((s, x) => s + Number(x.cost || 0), 0)
  );

  return (
    <>
      <PageHead
        title="Purchases"
        sub="Domains, hosting and licences bought for clients — what they paid, what it cost, what was kept."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Charged to clients"
          value={moneyMulti(billed, "—")}
          hint={`${charged.length} item${charged.length === 1 ? "" : "s"} billed`}
        />
        <Stat
          label="What they cost us"
          value={moneyMulti(cost, "—")}
          hint={
            absorbed.length
              ? `${absorbed.length} absorbed, not charged on`
              : "Everything was charged on"
          }
        />
        <Stat
          label="Kept"
          value={moneyMulti(kept, "—")}
          tone={kept.every((t) => t.total >= 0) ? "good" : "warn"}
          hint="Charged less cost, after anything absorbed"
        />
      </div>

      <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-ink-600 bg-ink-800/50 p-4">
        <Lock size={15} className="mt-0.5 shrink-0 text-bone-400" />
        <p className="text-[11px] leading-relaxed text-bone-300">
          <strong className="text-bone-100">These figures live only here.</strong> Purchases are
          left out of{" "}
          <Link href={`${BASE}/profit`} className="text-lime-400 hover:underline">Profitability</Link>{" "}
          and{" "}
          <Link href={`${BASE}/books`} className="text-lime-400 hover:underline">Money In &amp; Out</Link>{" "}
          on both sides — the cost and the client&rsquo;s payment — so those pages measure your
          own work. Clients still see exactly what they were charged in their portal; what it
          cost you and what you kept appear nowhere but this page.
        </p>
      </div>

      <div className="mt-8">
        {!groups.length ? (
          <Empty
            title="Nothing bought for a client yet"
            body="Record a domain, licence or hosting bill on a client or project under “Paid on their behalf”, and it appears here with what you kept on it."
          />
        ) : (
          <div className="space-y-3">
            {groups.map(({ client, items }, i) => {
              const gCharged = items.filter((x: any) => Number(x.bill_amount) > 0);
              const gBilled = sumByCurrency(gCharged, (x: any) => x.currency, (x: any) => Number(x.bill_amount));
              const gCost = sumByCurrency(items, (x: any) => x.currency, (x: any) => Number(x.cost || 0));
              const gCostBy = new Map<string, number>(gCost.map((t) => [t.currency, t.total] as const));
              const gKept = gBilled
                .map((t) => ({ currency: t.currency, total: t.total - (gCostBy.get(t.currency) ?? 0) }))
                .filter((t) => Math.abs(t.total) > 0.009);

              return (
                /* <details> rather than client state — no bundle, and it works
                   with JavaScript off, the same pattern as the services card. */
                <details key={client.id} className="card group border-ink-600" open={i === 0}>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 p-4 marker:content-none [&::-webkit-details-marker]:hidden">
                    <ShoppingBag size={15} className="shrink-0 text-lime-400" />

                    <span className="min-w-0 flex-1">
                      <Link
                        href={`${BASE}/clients/${client.id}`}
                        className="block truncate text-sm font-semibold text-bone-50 hover:text-lime-400"
                      >
                        {client.name}
                      </Link>
                      <span className="mono-tag mt-0.5 block text-[11px]">
                        {items.length} purchase{items.length === 1 ? "" : "s"}
                        {client.company ? ` · ${client.company}` : ""}
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-sm text-bone-100">
                        {moneyMulti(gKept, "—")}
                      </span>
                      <span className="mono-tag text-[10px]">kept</span>
                    </span>
                  </summary>

                  <div className="border-t border-ink-700 px-4 pb-4 pt-3">
                    <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-bone-300">
                      <span>Charged: <strong className="font-mono text-bone-100">{moneyMulti(gBilled, "—")}</strong></span>
                      <span>Cost: <strong className="font-mono text-bone-100">{moneyMulti(gCost, "—")}</strong></span>
                    </div>

                    <ul className="divide-y divide-ink-700">
                      {items.map((x: any) => {
                        const c = Number(x.cost || 0);
                        const b = Number(x.bill_amount || 0);
                        const margin = b - c;

                        return (
                          <li key={x.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                              <p className="mono-tag text-[10px] text-lime-300">
                                {expenseCategoryLabel(x.category)}
                              </p>
                              <p className="mt-0.5 truncate text-sm text-bone-100">{x.label}</p>
                              <p className="mt-0.5 text-[11px] text-bone-400">
                                {x.vendor ? `${x.vendor} · ` : ""}
                                {x.incurred_on}
                                {(x.projects as any)?.name ? ` · ${(x.projects as any).name}` : ""}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                              <div className="text-right">
                                <p className="font-mono text-xs text-bone-100">
                                  {money(b, x.currency)}
                                  <span className="text-bone-400"> / {money(c, x.currency)}</span>
                                </p>
                                <p
                                  className={`font-mono text-[11px] ${
                                    margin > 0
                                      ? "text-lime-400"
                                      : margin < 0
                                        ? "text-rose-300"
                                        : "text-bone-400"
                                  }`}
                                >
                                  {b > 0
                                    ? `${margin >= 0 ? "+" : "−"}${money(Math.abs(margin), x.currency)} kept`
                                    : "absorbed"}
                                </p>
                              </div>
                              {x.receipt_url && (
                                <a
                                  href={x.receipt_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Open receipt"
                                  className="text-bone-400 hover:text-lime-400"
                                >
                                  <FileText size={13} />
                                </a>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-6 text-[11px] leading-relaxed text-bone-300">
        Charged is what the client was billed; cost is what left your account. An item billed at
        zero was absorbed — recorded as a gesture rather than a loss nobody can explain later.
      </p>
    </>
  );
}
