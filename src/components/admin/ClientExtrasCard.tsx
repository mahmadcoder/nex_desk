import { Badge } from "@/components/admin/ui";
import { money, moneyMulti } from "@/lib/utils";
import { extrasPosition, invoiceOriginLabel } from "@/lib/billing";
import DocButton from "@/components/admin/DocButton";
import SendInvoiceButton from "@/components/admin/SendInvoiceButton";
import { Layers } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Everything billed outside the signed agreements.
 *
 * The Services card only ever showed invoices matching a deal, so a domain
 * re-bill or a change-request invoice appeared nowhere on this page — while
 * still being counted in the stat row at the top. That mismatch is what made
 * the totals look wrong: money was visible in a number and invisible in the
 * list underneath it.
 */
export default function ClientExtrasCard({ invoices }: { invoices: any[] }) {
  const rows = invoices.filter((i) => invoiceOriginLabel(i) !== null);
  if (!rows.length) return null;

  const pos = extrasPosition(rows);

  const describe = (inv: any) => {
    const first = Array.isArray(inv.line_items) ? inv.line_items[0] : null;
    return first?.item || inv.notes || "Additional item";
  };

  return (
    /* Collapsible, like the agreements above it. Both totals stay in the
       summary, so closing this hides the line items and never the money. */
    <details className="card group my-6 border-ink-600 p-5">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 border-b border-ink-700 pb-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-bone-50">
            <Layers size={16} className="text-lime-400" /> Extras &amp; one-offs
            <span className="mono-tag text-[11px]">{rows.length}</span>
          </h2>
          <p className="mt-1 text-xs text-bone-300">
            Change requests, retainer renewals, and costs paid on their behalf — billed
            separately from the signed agreements.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-sm text-bone-100">{moneyMulti(pos.billed, "—")}</p>
            <p className="mono-tag text-[11px]">
              {pos.outstanding.length ? `${moneyMulti(pos.outstanding)} owed` : "all paid"}
            </p>
          </div>
          <span className="mono-tag shrink-0 text-bone-300 group-open:hidden">+</span>
          <span className="mono-tag hidden shrink-0 text-bone-300 group-open:inline">−</span>
        </div>
      </summary>

      <ul className="divide-y divide-ink-700">
        {rows.map((inv) => (
          <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p style={{ fontFamily: "var(--font-mono)" }} className="text-xs text-bone-400">
                  {inv.invoice_no}
                </p>
                <span className="mono-tag rounded-full border border-ink-500 px-1.5 py-0.5 text-[9px] leading-none text-bone-300">
                  {invoiceOriginLabel(inv)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-bone-100">{describe(inv)}</p>
              <p className="text-[11px] text-bone-400">{inv.issue_date}</p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <p className="font-mono text-xs text-bone-100">
                  {money(Number(inv.amount_paid), inv.currency)} /{" "}
                  {money(Number(inv.total), inv.currency)}
                </p>
                <Badge>{inv.status}</Badge>
              </div>
              {inv.status === "draft" ? (
                <SendInvoiceButton
                  invoice={{
                    id: inv.id,
                    invoice_no: inv.invoice_no,
                    currency: inv.currency,
                    total: Number(inv.total),
                  }}
                />
              ) : (
                <DocButton type="invoice" id={inv.id} label="PDF" />
              )}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
