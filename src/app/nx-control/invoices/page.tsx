import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Stat, Empty } from "@/components/admin/ui";
import { money, moneyMulti, sumByCurrency } from "@/lib/utils";
import InvoicesByClient from "@/components/admin/InvoicesByClient";
import ListFilters, { matches } from "@/components/admin/ListFilters";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;

export const metadata = { title: "Invoices & Payments" };
export const dynamic = "force-dynamic";

/** Groups that answer a real question, rather than one chip per enum value. */
const GROUPS: Record<string, string[]> = {
  owed: ["sent", "partial", "overdue"],
  verification: ["sent", "partial", "overdue"],
  overdue: ["overdue"],
  draft: ["draft"],
  paid: ["paid"],
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const db = createAdminClient();

  const [{ data: invoices }, { data: clientProofs }] = await Promise.all([
    db.from("invoices").select("*, clients(id, name, email)").order("issue_date", { ascending: false }),
    db.from("documents")
      .select("id, invoice_id, storage_path, snapshot, created_at")
      .eq("uploaded_by_client", true)
      .not("invoice_id", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  const proofByInvoiceId = new Map<string, any>();
  for (const doc of clientProofs ?? []) {
    if (doc.invoice_id && !proofByInvoiceId.has(doc.invoice_id)) {
      proofByInvoiceId.set(doc.invoice_id, doc);
    }
  }

  // Grouped per currency — a USD invoice and a PKR invoice cannot be added up.
  const rows = (invoices ?? []).map((i) => ({
    ...i,
    client_proof: proofByInvoiceId.get(i.id) ?? null,
  }));

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

  const counts = {
    owed: rows.filter((i) => GROUPS.owed.includes(i.status)).length,
    verification: rows.filter((i) => !!i.client_proof && i.status !== "paid").length,
    overdue: rows.filter((i) => i.status === "overdue").length,
    draft: drafts.length,
    paid: rows.filter((i) => i.status === "paid").length,
    all: rows.length,
  };

  // Default to what is actually owed — the reason anyone opens this page.
  const known = ["owed", "verification", "overdue", "draft", "paid", "all"];
  const active = status && known.includes(status) ? status : counts.owed ? "owed" : "all";

  const filtered = rows.filter((i: any) => {
    if (active === "verification") {
      if (!i.client_proof || i.status === "paid") return false;
    } else {
      const inGroup = active === "all" || (GROUPS[active] ?? []).includes(i.status);
      if (!inGroup) return false;
    }
    return matches(q, i.invoice_no, i.clients?.name, i.clients?.email, i.notes);
  });

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
        {!!rows.length && (
          <ListFilters
            basePath={`${BASE}/invoices`}
            active={active}
            query={q}
            placeholder="Search client or invoice no…"
            chips={[
              { key: "owed", label: "Owed to us", count: counts.owed },
              ...(counts.verification > 0
                ? [{ key: "verification", label: "Proof Uploaded", count: counts.verification }]
                : []),
              { key: "overdue", label: "Overdue", count: counts.overdue },
              { key: "draft", label: "Scheduled", count: counts.draft },
              { key: "paid", label: "Settled", count: counts.paid },
              { key: "all", label: "Everything", count: counts.all },
            ]}
          />
        )}

        {!rows.length ? (
          <Empty title="No invoices yet" body="Locking a deal raises the advance invoice and drafts every remaining payment stage." />
        ) : !filtered.length ? (
          <Empty
            title="Nothing matches"
            body={q ? `No invoice matches "${q}" in this view.` : "No invoices in this view. Try another filter."}
          />
        ) : (
          // Grouped by client: a flat list of every invoice in the agency is
          // unreadable past a dozen rows, and the question is always "where
          // does THIS client stand".
          <InvoicesByClient invoices={filtered} />
        )}
      </div>
    </>
  );
}
