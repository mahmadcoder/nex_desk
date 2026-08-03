import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Table, Empty } from "@/components/admin/ui";
import LeadRow from "@/components/admin/LeadRow";
import { LEAD_STATUSES } from "@/lib/utils";
import ListFilters, { matches } from "@/components/admin/ListFilters";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;

export const metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const db = createAdminClient();
  const [{ data: leads }, { data: converted }] = await Promise.all([
    db.from("leads").select("*").order("created_at", { ascending: false }),
    db.from("clients").select("id, lead_id").not("lead_id", "is", null),
  ]);

  // lead_id → client_id, so an already-converted lead shows a link instead of
  // a button that would create a second client.
  const clientByLead = new Map<string, string>(
    (converted ?? []).map((c) => [c.lead_id as string, c.id as string])
  );

  const counts = (leads ?? []).reduce<Record<string, number>>((a, l) => {
    a[l.status] = (a[l.status] ?? 0) + 1;
    return a;
  }, {});

  // Spam sinks to the bottom rather than being hidden — you still want to see
  // that it arrived, and mis-marking something as spam has to be recoverable.
  const ordered = [...(leads ?? [])].sort(
    (a, b) => Number(a.status === "spam") - Number(b.status === "spam")
  );

  // The status counts were displayed and were not clickable, which is the one
  // thing anyone tries to do with them.
  const active = status && LEAD_STATUSES.includes(status as any) ? status : "all";

  const rows = ordered.filter((l: any) => {
    const inStatus = active === "all" || l.status === active;
    return (
      inStatus &&
      matches(q, l.name, l.email, l.company, l.phone, l.city, l.country, l.message, l.notes)
    );
  });

  return (
    <>
      <PageHead title="Leads" sub="Everything that came through the contact form. Mark website spam as spam, or delete it outright." />

      {!!leads?.length && (
        <ListFilters
          basePath={`${BASE}/leads`}
          active={active}
          query={q}
          placeholder="Search name, email, company…"
          chips={[
            { key: "all", label: "All", count: leads.length },
            ...LEAD_STATUSES.map((s) => ({ key: s, label: s, count: counts[s] ?? 0 })),
          ]}
        />
      )}

      {!leads?.length ? (
        <Empty title="Inbox is empty" body="New enquiries from the website land here, and the sender gets an auto-reply straight away." />
      ) : !rows.length ? (
        <Empty
          title="Nothing matches"
          body={q ? `No lead matches "${q}" in this view.` : "No leads with that status yet."}
        />
      ) : (
        <Table head={["Who", "Wants", "Budget", "When", "Status", ""]}>
          {rows.map((l) => (
            <LeadRow key={l.id} lead={l} convertedClientId={clientByLead.get(l.id) ?? null} />
          ))}
        </Table>
      )}
    </>
  );
}
