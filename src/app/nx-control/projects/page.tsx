import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Table, Empty } from "@/components/admin/ui";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const db = createAdminClient();
  const { data: projects } = await db.from("projects")
    .select("*, clients(name, company)").order("deadline");

  return (
    <>
      <PageHead title="Projects" sub="Everything currently on the desk." />
      {!projects?.length ? (
        <Empty title="No projects yet" body="Projects are created automatically when you lock a deal."
          href={`${BASE}/deals/new`} cta="Lock a deal" />
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
