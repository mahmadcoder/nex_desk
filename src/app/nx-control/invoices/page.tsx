import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Table, Stat, Empty } from "@/components/admin/ui";
import { money, moneyMulti, sumByCurrency } from "@/lib/utils";
import DocButton from "@/components/admin/DocButton";
import PaymentDialog from "@/components/admin/PaymentDialog";
import SendInvoiceButton from "@/components/admin/SendInvoiceButton";

export const metadata = { title: "Invoices & Payments" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const db = createAdminClient();
  const { data: invoices } = await db.from("invoices")
    .select("*, clients(id, name, email)").order("issue_date", { ascending: false });

  // Grouped per currency — a USD invoice and a PKR invoice cannot be added up.
  const rows = invoices ?? [];

  // Drafts are future payment stages the client has not been billed for yet, so
  // they belong in their own "scheduled" bucket — counting them as invoiced
  // would overstate what is actually owed to us today.
  const issued = rows.filter((i) => i.status !== "draft");
  const drafts = rows.filter((i) => i.status === "draft");

  const total = sumByCurrency(issued, (i) => i.currency, (i) => Number(i.total));
  const paid = sumByCurrency(issued, (i) => i.currency, (i) => Number(i.amount_paid));
  const scheduled = sumByCurrency(drafts, (i) => i.currency, (i) => Number(i.total));
  const overdueTotals = sumByCurrency(
    rows.filter((i) => i.status === "overdue"),
    (i) => i.currency,
    (i) => Number(i.total) - Number(i.amount_paid)
  );

  return (
    <>
      <PageHead title="Invoices" sub="Locking a deal drafts every payment stage. Send one to bill it; recording a payment sends the receipt automatically." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Invoiced" value={moneyMulti(total)} />
        <Stat label="Collected" value={moneyMulti(paid)} tone="good" />
        <Stat
          label="Overdue"
          value={moneyMulti(overdueTotals, money(0, "PKR"))}
          tone={overdueTotals.length ? "warn" : "default"}
        />
        <Stat label="Scheduled (draft)" value={moneyMulti(scheduled, "—")} />
      </div>

      <div className="mt-8">
        {!invoices?.length ? (
          <Empty title="No invoices yet" body="Locking a deal raises the advance invoice and drafts every remaining payment stage." />
        ) : (
          <Table head={["Invoice", "Client", "Total", "Paid", "Due", "Status", ""]}>
            {invoices.map((i) => (
              <tr key={i.id} className="hover:bg-ink-700/30">
                <td className="px-5 py-3" style={{ fontFamily: "var(--font-mono)" }}>{i.invoice_no}</td>
                <td className="px-5 py-3 text-bone-400">{(i.clients as any)?.name}</td>
                <td className="px-5 py-3">{money(Number(i.total), i.currency)}</td>
                <td className="px-5 py-3 text-bone-400">{money(Number(i.amount_paid), i.currency)}</td>
                <td className="px-5 py-3 text-bone-400">{i.due_date ?? "—"}</td>
                <td className="px-5 py-3"><Badge>{i.status}</Badge></td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <DocButton type="invoice" id={i.id} label="PDF" />
                    {/* A draft has not been billed yet, so there is nothing to
                        pay against it — issue it first. */}
                    {i.status === "draft" ? (
                      <SendInvoiceButton
                        invoice={{
                          id: i.id, invoice_no: i.invoice_no, currency: i.currency,
                          total: Number(i.total), client_name: (i.clients as any)?.name,
                        }}
                        label="Send invoice"
                      />
                    ) : i.status !== "paid" ? (
                      <PaymentDialog
                        invoice={{
                          id: i.id, invoice_no: i.invoice_no, currency: i.currency,
                          balance: Number(i.total) - Number(i.amount_paid),
                          client_id: (i.clients as any).id,
                        }}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
