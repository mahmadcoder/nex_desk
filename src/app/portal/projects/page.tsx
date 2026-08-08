import { getPortalSession } from "@/lib/portal/session";
import { loadProjects } from "@/lib/portal/data";
import ProjectCard from "@/components/portal/ProjectCard";
import { redirect } from "next/navigation";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects" };

export default async function PortalProjects() {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const { projects, teamFor } = await loadProjects(session.client.id);

  const active = projects.filter(
    (p: any) => !["completed", "cancelled", "delivered"].includes(String(p.status))
  );
  const done = projects.filter((p: any) =>
    ["completed", "delivered"].includes(String(p.status))
  );
  const cancelled = projects.filter((p: any) => String(p.status) === "cancelled");

  return (
    <>
      <header className="border-b border-ink-600 pb-6">
        <p className="mono-tag text-lime-400">Projects</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-bone-50">
          Everything we are building for you.
        </h1>
      </header>

      {!projects.length && (
        <p className="mt-8 text-sm text-bone-400">
          No projects yet. As soon as an agreement is signed, the work appears here.
        </p>
      )}

      <Group title="Active" items={active} teamFor={teamFor} />
      <Group title="Completed" items={done} teamFor={teamFor} />
      <Group title="Cancelled" items={cancelled} teamFor={teamFor} />
    </>
  );
}

function Group({
  title,
  items,
  teamFor,
}: {
  title: string;
  items: any[];
  teamFor: (id: string) => any[];
}) {
  // An empty group is not an empty state worth showing — most clients will
  // never have a cancelled project and do not need a heading telling them so.
  if (!items.length) return null;

  return (
    <section className="mt-9">
      <h2 className="mono-tag mb-4">
        {title} <span className="text-bone-500">({items.length})</span>
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((p) => (
          <ProjectCard key={p.id} project={p} team={teamFor(p.id)} />
        ))}
      </div>
    </section>
  );
}
