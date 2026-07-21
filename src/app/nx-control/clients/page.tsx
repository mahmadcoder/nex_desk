import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Table, Empty } from "@/components/admin/ui";
import ClientDialog from "@/components/admin/ClientDialog";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const db = createAdminClient();
  const { data: clients } = await db
    .from("clients")
    .select("*, projects(id), invoices(total, amount_paid)")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHead title="Clients" sub="Everyone you've worked with." action={<ClientDialog />} />

      {!clients?.length ? (
        <Empty title="No clients yet" body="Convert a lead, or add someone manually with the button above." />
      ) : (
        <Table head={["Client", "Company", "Where", "Projects", "Billed", ""]}>
          {clients.map((c) => {
            const billed = (c.invoices as any[])?.reduce((s, i) => s + Number(i.total), 0) ?? 0;
            return (
              <tr key={c.id} className="hover:bg-ink-700/30">
                <td className="px-5 py-3">
                  <Link href={`${BASE}/clients/${c.id}`} className="hover:text-lime-400">{c.name}</Link>
                  <p className="text-xs text-bone-400">{c.email}</p>
                </td>
                <td className="px-5 py-3 text-bone-400">{c.company ?? "—"}</td>
                <td className="px-5 py-3 text-bone-400">{[c.city, c.country].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-5 py-3">{(c.projects as any[])?.length ?? 0}</td>
                <td className="px-5 py-3" style={{ fontFamily: "var(--font-mono)" }}>
                  {c.preferred_currency} {billed.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={`${BASE}/clients/${c.id}`} className="mono-tag hover:text-lime-400">open →</Link>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
