import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { PageHead, Table, Empty } from "@/components/admin/ui";
import { moneyMulti, sumByCurrency } from "@/lib/utils";
import ClientDialog from "@/components/admin/ClientDialog";
import { PlatformIcon } from "@/components/brand/PlatformIcons";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const me = await getCurrentStaff();
  if (!me) return null;

  const db = createAdminClient();
  const canManage = me.isPrivileged;

  // Staff see only the clients they are assigned to, and never billing figures.
  // `assignedClientIds` fails closed, so no assignments means no rows.
  let query = db
    .from("clients")
    .select(canManage ? "*, projects(id), invoices(total, amount_paid, currency, status)" : "*, projects(id)")
    .order("created_at", { ascending: false });

  if (!canManage) {
    const ids = await assignedClientIds(me.employeeId);
    if (!ids.length) {
      return (
        <>
          <PageHead title="My Clients" sub="The clients you are assigned to." />
          <Empty
            title="No clients assigned to you yet"
            body="An owner or admin assigns clients to you. Once they do, they appear here."
          />
        </>
      );
    }
    query = query.in("id", ids);
  }

  const { data: clients } = await query;

  const head = canManage
    ? ["Client", "Company", "Platform / Source", "Where", "Projects", "Billed", ""]
    : ["Client", "Company", "Where", "Projects", ""];

  return (
    <>
      <PageHead
        title={canManage ? "Clients" : "My Clients"}
        sub={
          canManage
            ? "Everyone you've worked with and their acquisition channels."
            : "The clients you are assigned to."
        }
        action={canManage ? <ClientDialog /> : undefined}
      />

      {!clients?.length ? (
        <Empty title="No clients yet" body="Convert a lead, or add someone manually with the button above." />
      ) : (
        <Table head={head}>
          {(clients as any[]).map((c) => {
            // Per invoice currency, and drafts excluded — the figure used to be
            // a raw sum stamped with the client's preferred currency, so a USD
            // invoice was displayed as PKR.
            const billed = sumByCurrency(
              ((c.invoices as any[]) ?? []).filter((i) => i.status !== "draft"),
              (i) => i.currency,
              (i) => Number(i.total)
            );
            const sourceDisplay = c.source
              ? c.source.charAt(0).toUpperCase() + c.source.slice(1).replace(/_/g, " ")
              : "Website";

            return (
              <tr key={c.id} className="hover:bg-ink-700/30">
                <td className="px-5 py-3">
                  <Link href={`${BASE}/clients/${c.id}`} className="hover:text-lime-400 font-medium">{c.name}</Link>
                  <p className="text-xs text-bone-300">{c.email}</p>
                </td>
                <td className="px-5 py-3 text-bone-300">{c.company ?? "—"}</td>

                {canManage && (
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-800 px-3 py-1 text-xs text-bone-100 border border-ink-600 font-mono">
                      <PlatformIcon id={c.source || "website"} className="w-3.5 h-3.5 shrink-0" />
                      <span>{sourceDisplay}</span>
                    </span>
                  </td>
                )}

                <td className="px-5 py-3 text-bone-300">{[c.city, c.country].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-5 py-3 font-mono text-xs">{(c.projects as any[])?.length ?? 0}</td>

                {canManage && (
                  <td className="px-5 py-3" style={{ fontFamily: "var(--font-mono)" }}>
                    {moneyMulti(billed, "—")}
                  </td>
                )}

                <td className="px-5 py-3 text-right">
                  <div className="inline-flex items-center justify-end gap-3">
                    {canManage && (
                      <ClientDialog
                        clientToEdit={c}
                        trigger={
                          <button type="button" className="mono-tag hover:text-lime-400 cursor-pointer inline-flex items-center">edit</button>
                        }
                      />
                    )}
                    <Link href={`${BASE}/clients/${c.id}`} className="mono-tag hover:text-lime-400 inline-flex items-center">open →</Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
