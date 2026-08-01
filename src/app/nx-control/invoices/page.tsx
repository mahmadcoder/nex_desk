import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Stat, Empty } from "@/components/admin/ui";
import { money, moneyMulti, sumByCurrency } from "@/lib/utils";
import InvoicesByClient from "@/components/admin/InvoicesByClient";

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
          // Grouped by client: a flat list of every invoice in the agency is
          // unreadable past a dozen rows, and the question is always "where
          // does THIS client stand".
          <InvoicesByClient invoices={invoices} />
        )}
      </div>
    </>
  );
}
