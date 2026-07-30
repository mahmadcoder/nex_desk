import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Table, Empty } from "@/components/admin/ui";
import LeadRow from "@/components/admin/LeadRow";

export const metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
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

  return (
    <>
      <PageHead title="Leads" sub="Everything that came through the contact form." />

      <div className="mb-6 flex flex-wrap gap-2">
        {["new", "contacted", "quoted", "won", "lost"].map((s) => (
          <span key={s} className="flex items-center gap-2 rounded-full border border-ink-600 px-3 py-1.5 text-xs">
            <Badge>{s}</Badge>
            <span className="text-bone-400">{counts[s] ?? 0}</span>
          </span>
        ))}
      </div>

      {!leads?.length ? (
        <Empty title="Inbox is empty" body="New enquiries from the website land here, and the sender gets an auto-reply straight away." />
      ) : (
        <Table head={["Who", "Wants", "Budget", "When", "Status", ""]}>
          {leads.map((l) => (
            <LeadRow key={l.id} lead={l} convertedClientId={clientByLead.get(l.id) ?? null} />
          ))}
        </Table>
      )}
    </>
  );
}
