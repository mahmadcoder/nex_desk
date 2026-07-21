import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Table, Empty } from "@/components/admin/ui";
import { money } from "@/lib/utils";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const db = createAdminClient();
  const { data: deals } = await db.from("deals")
    .select("*, clients(name, company)").order("created_at", { ascending: false });

  return (
    <>
      <PageHead
        title="Deals"
        sub="Every quote and locked agreement."
        action={<Link href={`${BASE}/deals/new`} className="btn btn-primary h-10">Lock a deal</Link>}
      />

      {!deals?.length ? (
        <Empty title="No deals yet" body="Lock your first deal and the agreement PDF goes out automatically."
          href={`${BASE}/deals/new`} cta="Lock a deal" />
      ) : (
        <Table head={["Deal", "Client", "Total", "Deadline", "Status", "Locked"]}>
          {deals.map((d) => (
            <tr key={d.id} className="hover:bg-ink-700/30">
              <td className="px-5 py-3">
                <p style={{ fontFamily: "var(--font-mono)" }} className="text-xs text-bone-400">{d.deal_no}</p>
                <p>{d.title}</p>
              </td>
              <td className="px-5 py-3 text-bone-400">
                {(d.clients as any)?.name}
                {(d.clients as any)?.company && <span className="block text-xs">{(d.clients as any).company}</span>}
              </td>
              <td className="px-5 py-3">{money(Number(d.total), d.currency)}</td>
              <td className="px-5 py-3 text-bone-400">{d.deadline ?? "—"}</td>
              <td className="px-5 py-3"><Badge>{d.status}</Badge></td>
              <td className="px-5 py-3 text-bone-400">
                {d.locked_at ? new Date(d.locked_at).toLocaleDateString("en-GB") : "—"}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
