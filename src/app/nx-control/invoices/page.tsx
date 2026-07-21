import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Table, Stat, Empty } from "@/components/admin/ui";
import { money } from "@/lib/utils";
import DocButton from "@/components/admin/DocButton";
import PaymentDialog from "@/components/admin/PaymentDialog";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const db = createAdminClient();
  const { data: invoices } = await db.from("invoices")
    .select("*, clients(id, name, email)").order("issue_date", { ascending: false });

  const total = (invoices ?? []).reduce((s, i) => s + Number(i.total), 0);
  const paid = (invoices ?? []).reduce((s, i) => s + Number(i.amount_paid), 0);
  const overdue = (invoices ?? []).filter((i) => i.status === "overdue")
    .reduce((s, i) => s + Number(i.total) - Number(i.amount_paid), 0);

  return (
    <>
      <PageHead title="Invoices" sub="Recording a payment sends the receipt automatically." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Invoiced" value={money(total)} />
        <Stat label="Collected" value={money(paid)} tone="good" />
        <Stat label="Overdue" value={money(overdue)} tone={overdue > 0 ? "warn" : "default"} />
      </div>

      <div className="mt-8">
        {!invoices?.length ? (
          <Empty title="No invoices yet" body="The advance invoice is raised automatically the moment you lock a deal." />
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
                    {i.status !== "paid" && (
                      <PaymentDialog
                        invoice={{
                          id: i.id, invoice_no: i.invoice_no, currency: i.currency,
                          balance: Number(i.total) - Number(i.amount_paid),
                          client_id: (i.clients as any).id,
                        }}
                      />
                    )}
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
