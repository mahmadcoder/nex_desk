import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { PageHead, Badge, Table, Empty } from "@/components/admin/ui";
import ListFilters, { matches } from "@/components/admin/ListFilters";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

/**
 * "Live" is the default because it answers the question people actually open
 * this page with. Delivered and cancelled projects stayed in the list forever,
 * so the board got steadily less useful the more work you finished.
 */
const GROUPS: Record<string, string[]> = {
  live: ["not_started", "in_progress", "review"],
  on_hold: ["on_hold"],
  done: ["delivered", "completed"],
  cancelled: ["cancelled"],
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; archived?: string }>;
}) {
  const me = await getCurrentStaff();
  if (!me) return null;

  const { status, q, archived } = await searchParams;
  const showArchived = archived === "1";

  const canManage = me.isPrivileged;
  const db = createAdminClient();

  let query = db.from("projects").select("*, clients(name, company)").order("deadline");

  // Archived projects are hidden by default. `is null` rather than a flag
  // comparison, because the column is null for everything never archived.
  query = showArchived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);

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
  const all = projects ?? [];

  const counts = {
    live: all.filter((p) => GROUPS.live.includes(p.status)).length,
    on_hold: all.filter((p) => GROUPS.on_hold.includes(p.status)).length,
    done: all.filter((p) => GROUPS.done.includes(p.status)).length,
    cancelled: all.filter((p) => GROUPS.cancelled.includes(p.status)).length,
    all: all.length,
  };

  // Land on "live" only while there is live work — otherwise an account whose
  // projects are all delivered would open to an empty board.
  const known = ["live", "on_hold", "done", "cancelled", "all"];
  const active = status && known.includes(status) ? status : counts.live ? "live" : "all";

  const rows = all.filter((p: any) => {
    const inGroup = active === "all" || (GROUPS[active] ?? []).includes(p.status);
    return inGroup && matches(q, p.name, p.clients?.name, p.clients?.company, p.status);
  });

  return (
    <>
      <PageHead
        title={canManage ? "Projects" : "My Projects"}
        sub={
          showArchived
            ? "Archived projects. Everything is still here — nothing was deleted."
            : canManage
              ? "Everything currently on the desk."
              : "Projects for the clients you are assigned to."
        }
        action={
          canManage ? (
            <Link
              href={showArchived ? `${BASE}/projects` : `${BASE}/projects?archived=1`}
              className="mono-tag text-[11px] hover:text-lime-400"
            >
              {showArchived ? "← back to active" : "view archived"}
            </Link>
          ) : undefined
        }
      />

      {!!all.length && (
        <ListFilters
          basePath={`${BASE}/projects`}
          active={active}
          query={q}
          placeholder="Search projects or clients…"
          chips={[
            { key: "live", label: "Live", count: counts.live },
            { key: "on_hold", label: "On hold", count: counts.on_hold },
            { key: "done", label: "Delivered", count: counts.done },
            { key: "cancelled", label: "Cancelled", count: counts.cancelled },
            { key: "all", label: "Everything", count: counts.all },
          ]}
        />
      )}

      {!all.length ? (
        canManage ? (
          <Empty title="No projects yet" body="Projects are created automatically when you lock a deal."
            href={`${BASE}/deals/new`} cta="Lock a deal" />
        ) : (
          <Empty title="No projects yet" body="Nothing has been assigned to you." />
        )
      ) : !rows.length ? (
        <Empty
          title="Nothing matches"
          body={q ? `No project matches "${q}" in this view. Try another filter or clear the search.` : "No projects in this view. Try another filter."}
        />
      ) : (
        <Table head={["Project", "Client", "Progress", "Deadline", "Status"]}>
          {rows.map((p: any) => (
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
