import Link from "next/link";
import { Badge } from "./ui";
import { money, moneyMulti, sumByCurrency, adminPath } from "@/lib/utils";
import DocButton from "@/components/admin/DocButton";
import PaymentDialog from "@/components/admin/PaymentDialog";
import SendInvoiceButton from "@/components/admin/SendInvoiceButton";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Invoices grouped by who owes the money.
 *
 * A flat list of every invoice in the agency is unreadable past about a dozen
 * rows: the question is never "show me all invoices", it is "where does this
 * client stand". Each client collapses to one line with their position, and
 * opens to the individual invoices.
 *
 * Anyone who owes something is expanded by default — that is the row you came
 * to look at. Fully settled clients stay shut.
 */
export default function InvoicesByClient({ invoices }: { invoices: any[] }) {
  const byClient = new Map<string, { client: any; rows: any[] }>();

  for (const inv of invoices) {
    const client = (inv.clients as any) ?? { id: "none", name: "No client" };
    const entry = byClient.get(client.id) ?? { client, rows: [] };
    entry.rows.push(inv);
    byClient.set(client.id, entry);
  }

  const groups = [...byClient.values()]
    .map(({ client, rows }) => {
      const issued = rows.filter((r) => r.status !== "draft");
      const owed = sumByCurrency(
        issued, (r) => r.currency, (r) => Number(r.total) - Number(r.amount_paid)
      ).filter((t) => t.total > 0.009);

      return {
        client,
        rows,
        issued,
        owed,
        overdue: rows.filter((r) => r.status === "overdue").length,
        billed: sumByCurrency(issued, (r) => r.currency, (r) => Number(r.total)),
        paid: sumByCurrency(issued, (r) => r.currency, (r) => Number(r.amount_paid)),
        drafts: rows.filter((r) => r.status === "draft").length,
      };
    })
    // Whoever owes the most, first — and overdue above everything.
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return b.overdue - a.overdue;
      const owedA = a.owed.reduce((s, t) => s + t.total, 0);
      const owedB = b.owed.reduce((s, t) => s + t.total, 0);
      return owedB - owedA;
    });

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <details
          key={g.client.id}
          className="card group border-ink-600"
          open={g.owed.length > 0}
        >
          <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 p-4 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-bone-50">
                {g.client.name}
              </span>
              <span className="mono-tag mt-0.5 block text-[11px]">
                {g.rows.length} invoice{g.rows.length === 1 ? "" : "s"}
                {g.drafts ? ` · ${g.drafts} scheduled` : ""}
                {g.overdue ? ` · ${g.overdue} overdue` : ""}
              </span>
            </span>

            <span className="shrink-0 text-right">
              <span className="mono-tag block text-[11px]">Paid of billed</span>
              <span className="block font-mono text-sm text-bone-50">
                {moneyMulti(g.paid, "—")} / {moneyMulti(g.billed, "—")}
              </span>
            </span>

            <span
              className={`mono-tag shrink-0 rounded-full border px-3 py-1.5 text-[11px] leading-none font-semibold ${
                g.overdue
                  ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                  : g.owed.length
                    ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
                    : "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
              }`}
            >
              {g.owed.length ? `${moneyMulti(g.owed)} due` : "Settled"}
            </span>

            <span className="mono-tag shrink-0 text-bone-300 group-open:hidden">+</span>
            <span className="mono-tag hidden shrink-0 text-bone-300 group-open:inline">−</span>
          </summary>

          <div className="border-t border-ink-700">
            <div className="flex items-center justify-between px-4 py-2.5">
              <Link
                href={adminPath(`/clients/${g.client.id}`)}
                className="mono-tag text-[11px] hover:text-lime-400"
              >
                open client →
              </Link>
              {g.client.email && (
                <span className="mono-tag text-[11px] text-bone-300">{g.client.email}</span>
              )}
            </div>

            <ul className="divide-y divide-ink-700">
              {g.rows.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block font-mono text-xs text-bone-100">{i.invoice_no}</span>
                    <span className="mono-tag mt-0.5 block text-[11px]">
                      {i.status === "draft"
                        ? `${money(Number(i.total), i.currency)} · not billed yet`
                        : `${money(Number(i.amount_paid), i.currency)} of ${money(Number(i.total), i.currency)}`}
                      {i.due_date ? ` · due ${i.due_date}` : ""}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    <Badge>{i.status}</Badge>
                    {i.status === "draft" ? (
                      <SendInvoiceButton
                        invoice={{
                          id: i.id, invoice_no: i.invoice_no, currency: i.currency,
                          total: Number(i.total), client_name: g.client.name,
                        }}
                        label="Send"
                      />
                    ) : (
                      <>
                        <DocButton type="invoice" id={i.id} label="PDF" />
                        {i.status !== "paid" && (
                          <PaymentDialog
                            invoice={{
                              id: i.id, invoice_no: i.invoice_no, currency: i.currency,
                              balance: Number(i.total) - Number(i.amount_paid),
                              client_id: g.client.id,
                            }}
                          />
                        )}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ))}
    </div>
  );
}
