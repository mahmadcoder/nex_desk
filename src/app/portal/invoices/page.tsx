import { requirePortalPerm } from "@/lib/portal/session";
import { loadBilling, loadVisibleExpenses } from "@/lib/portal/data";
import { money, moneyMulti, daysUntil } from "@/lib/utils";
import { fmtDate } from "@/lib/datetime";
import { invoiceOriginLabel } from "@/lib/billing";
import { expenseCategoryLabel } from "@/config/expenseCategories";
import { Badge } from "@/components/admin/ui";
import { DollarSign, Receipt, FileText } from "lucide-react";
import { redirect } from "next/navigation";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices" };

export default async function PortalInvoices() {
  // Not just a hidden nav link — a client with show_invoices off who types this
  // URL is sent back to the dashboard.
  const session = await requirePortalPerm("show_invoices");
  if (!session) redirect("/portal");

  const { perms } = session;
  const [billing, expenses] = await Promise.all([
    loadBilling(session.client.id),
    loadVisibleExpenses(session.client.id),
  ]);

  return (
    <>
      <header className="border-b border-ink-600 pb-6">
        <p className="mono-tag text-lime-400">Invoices</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-bone-50">
          Every number, and where it came from.
        </h1>
        {!!billing.billedCurrencies.length && (
          <p className="mt-2 text-sm text-bone-300">
            Billed in{" "}
            <strong className="font-semibold text-lime-400">
              {billing.billedCurrencies.join(", ")}
            </strong>
          </p>
        )}
      </header>

      {/* Totals are grouped per currency. Summing them together and labelling
          the result with `preferred_currency` once showed a client billed in
          USD their figures marked "Rs". */}
      {perms.show_financials && (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card label="Contract value" value={moneyMulti(billing.contractValue, "—")}>
            Agreed total across your signed agreements
          </Card>
          <Card
            label="Total amount paid"
            value={moneyMulti(billing.totalPaid, "—")}
            tone="good"
            border
          >
            Across your agreements and any additional items
          </Card>
          <Card
            label="Balance on contract"
            value={
              billing.balanceOwed.length
                ? moneyMulti(billing.balanceOwed)
                : billing.hasBilling
                  ? "Settled in full"
                  : "—"
            }
            tone={billing.balanceOwed.length ? "warn" : undefined}
          >
            {/* Kept apart from extras on purpose. Subtracting every payment
                from the agreed total once showed a client who had paid for a
                domain a smaller balance than they actually owed. */}
            What is still owed on the agreement itself
          </Card>
          <Card
            label="Total outstanding"
            value={billing.totalOwed.length ? moneyMulti(billing.totalOwed) : "Nothing due"}
            tone={billing.totalOwed.length ? "warn" : "good"}
          >
            Everything owed, of every kind
          </Card>
        </section>
      )}

      <section className="card mt-8 p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-ink-600 pb-4">
          <h2 className="flex items-center gap-2 text-lg font-medium leading-tight text-bone-50">
            <DollarSign className="h-4 w-4 text-lime-400" /> Invoices &amp; receipts
          </h2>
          {!!billing.totalOwed.length && (
            <span className="mono-tag text-xs text-amber-400">
              {moneyMulti(billing.totalOwed)} due
            </span>
          )}
        </div>

        {/* min-w-0 + shrink-0: without them a long multi-currency
            "Paid … / Total …" refuses to shrink and pushes the badge off the
            edge of the card. */}
        <ul className="mt-4 divide-y divide-ink-600">
          {billing.invoices.map((i: any) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3.5 text-sm"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-mono text-bone-100">
                  {i.invoice_no}
                  {/* So a client can tell a payment stage from a domain re-bill
                      without having to ask us. */}
                  {invoiceOriginLabel(i) && (
                    <span className="mono-tag rounded-full border border-ink-500 px-1.5 py-0.5 text-[9px] leading-none text-bone-300">
                      {invoiceOriginLabel(i)}
                    </span>
                  )}
                </p>
                <p className="text-xs text-bone-300">
                  Paid: {money(Number(i.amount_paid), i.currency)} / Total:{" "}
                  {money(Number(i.total), i.currency)}
                  {i.due_date ? ` · due ${fmtDate(i.due_date)}` : ""}
                </p>
              </div>
              <span className="shrink-0">
                <Badge>{i.status}</Badge>
              </span>
            </li>
          ))}
          {!billing.invoices.length && (
            <li className="py-6 text-center text-sm text-bone-300">No invoices issued yet.</li>
          )}
        </ul>
      </section>

      {/* What we bought on their behalf, with the receipt for each, so a charge
          on an invoice can always be traced without having to ask us. */}
      {!!expenses.length && (
        <section className="card mt-6 p-5 sm:p-6">
          <div className="border-b border-ink-600 pb-4">
            <h2 className="flex items-center gap-2 text-lg font-medium leading-tight text-bone-50">
              <Receipt className="h-4 w-4 text-lime-400" /> Paid on your behalf
            </h2>
            <p className="mt-1.5 text-xs text-bone-300">
              Domains, hosting, licences and anything else we bought for you outside the agreed
              fee. Every receipt is here.
            </p>
          </div>

          <ul className="mt-4 divide-y divide-ink-600">
            {expenses.map((x: any) => {
              const renewsIn = daysUntil(x.renews_on);
              return (
                <li key={x.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <p className="mono-tag text-[10px] text-lime-300">
                      {expenseCategoryLabel(x.category)}
                    </p>
                    <p className="mt-0.5 text-sm text-bone-100">{x.label}</p>
                    <p className="mt-0.5 text-xs text-bone-300">
                      {x.vendor ? `${x.vendor} · ` : ""}
                      {fmtDate(x.incurred_on)}
                      {renewsIn !== null && renewsIn >= 0 && (
                        <span className={renewsIn <= 30 ? "text-amber-400" : ""}>
                          {" "}
                          · renews {fmtDate(x.renews_on)}
                        </span>
                      )}
                    </p>
                    {x.details && (
                      <p className="mt-1 text-xs leading-relaxed text-bone-300">{x.details}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {/* Zero is not "free of charge by accident" — say so. */}
                    <span className="font-mono text-sm text-bone-100">
                      {Number(x.bill_amount) > 0
                        ? money(Number(x.bill_amount), x.currency)
                        : "Covered by us"}
                    </span>
                    {x.receipt_url && (
                      <a
                        href={x.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-lime-400 hover:underline"
                      >
                        <FileText className="h-3 w-3" /> Receipt
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

function Card({
  label,
  value,
  children,
  tone,
  border,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
  tone?: "good" | "warn";
  border?: boolean;
}) {
  return (
    <div className={`card p-5 ${border ? "border-lime-500/30" : ""}`}>
      <span
        className={`mono-tag mb-1 block text-xs ${
          tone === "good" ? "text-lime-400" : "text-bone-300"
        }`}
      >
        {label}
      </span>
      <p
        className={`font-mono text-2xl ${
          tone === "good" ? "text-lime-400" : tone === "warn" ? "text-amber-400" : "text-bone-50"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-bone-300">{children}</p>
    </div>
  );
}
