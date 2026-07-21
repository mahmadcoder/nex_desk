import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Table, Empty } from "@/components/admin/ui";
import LeadRow from "@/components/admin/LeadRow";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const db = createAdminClient();
  const { data: leads } = await db.from("leads").select("*").order("created_at", { ascending: false });

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
          {leads.map((l) => <LeadRow key={l.id} lead={l} />)}
        </Table>
      )}
    </>
  );
}
