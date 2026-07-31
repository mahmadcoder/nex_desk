import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { PageHead, Badge, Table, Empty } from "@/components/admin/ui";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const me = await getCurrentStaff();
  if (!me) return null;

  const canManage = me.isPrivileged;
  const db = createAdminClient();

  let query = db.from("projects").select("*, clients(name, company)").order("deadline");

  // Staff see only projects belonging to clients they are assigned to.
  if (!canManage) {
    const ids = await assignedClientIds(me.employeeId);
    if (!ids.length) {
      return (
        <>
          <PageHead title="My Projects" sub="Projects for the clients you are assigned to." />
          <Empty
            title="No projects assigned to you yet"
            body="Once an owner or admin assigns you to a client, their projects appear here."
          />
        </>
      );
    }
    query = query.in("client_id", ids);
  }

  const { data: projects } = await query;

  return (
    <>
      <PageHead
        title={canManage ? "Projects" : "My Projects"}
        sub={canManage ? "Everything currently on the desk." : "Projects for the clients you are assigned to."}
      />
      {!projects?.length ? (
        canManage ? (
          <Empty title="No projects yet" body="Projects are created automatically when you lock a deal."
            href={`${BASE}/deals/new`} cta="Lock a deal" />
        ) : (
          <Empty title="No projects yet" body="Nothing has been assigned to you." />
        )
      ) : (
        <Table head={["Project", "Client", "Progress", "Deadline", "Status"]}>
          {projects.map((p) => (
            <tr key={p.id} className="hover:bg-ink-700/30">
              <td className="px-5 py-3">
                <Link href={`${BASE}/projects/${p.id}`} className="hover:text-lime-400">{p.name}</Link>
              </td>
              <td className="px-5 py-3 text-bone-400">{(p.clients as any)?.name}</td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-20 overflow-hidden rounded bg-ink-600">
                    <div className="h-1 bg-lime-400" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="mono-tag">{p.progress}%</span>
                </div>
              </td>
              <td className="px-5 py-3 text-bone-400">{p.deadline ?? "—"}</td>
              <td className="px-5 py-3"><Badge>{p.status}</Badge></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
