import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";
import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/admin/ui";
import RaiseTicket from "@/components/portal/RaiseTicket";
import { fmtDate } from "@/lib/datetime";
import { LifeBuoy } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";
export const metadata = { title: "Support" };

const OPEN = ["open", "in_progress", "waiting_client"];

const SAYS: Record<string, string> = {
  open: "With us",
  in_progress: "Being worked on",
  waiting_client: "Waiting on you",
  resolved: "Resolved",
  closed: "Closed",
};

export default async function PortalSupport() {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const db = createAdminClient();
  const [{ data: tickets, error }, { data: projects }] = await Promise.all([
    db
      .from("tickets")
      .select("id, subject, status, priority, created_at, first_response_at, projects(name)")
      .eq("client_id", session.client.id)
      .order("created_at", { ascending: false }),
    db
      .from("projects")
      .select("id, name")
      .eq("client_id", session.client.id)
      .order("created_at", { ascending: false }),
  ]);

  if (error?.code === "42P01") {
    return (
      <>
        <header className="border-b border-ink-600 pb-6">
          <p className="mono-tag text-lime-400">Support</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-bone-50">
            Report a problem.
          </h1>
        </header>
        <p className="card mt-8 p-8 text-center text-sm text-bone-300">
          Support tickets are not switched on yet. Email or WhatsApp us in the meantime.
        </p>
      </>
    );
  }

  const rows = tickets ?? [];
  const open = rows.filter((t: any) => OPEN.includes(t.status));
  const done = rows.filter((t: any) => !OPEN.includes(t.status));

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-600 pb-6">
        <div>
          <p className="mono-tag text-lime-400">Support</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-bone-50">
            Something not right?
          </h1>
          <p className="mt-2 text-sm text-bone-300">
            Report it here and it stays attached to your account — unlike an email, you can see
            exactly where it stands.
          </p>
        </div>
        {/* A paused account is read-only everywhere else; it is here too. */}
        {!session.isPaused && <RaiseTicket projects={projects ?? []} />}
      </header>

      {!rows.length ? (
        <section className="card mt-8 p-10 text-center">
          <LifeBuoy className="mx-auto h-8 w-8 text-lime-400" aria-hidden />
          <p className="mt-4 text-sm text-bone-200">Nothing reported.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-bone-400">
            If something breaks or looks wrong, tell us here rather than by email — you will be
            able to follow it.
          </p>
        </section>
      ) : (
        <>
          <Group title="Open" items={open} says={SAYS} />
          <Group title="Closed" items={done} says={SAYS} />
        </>
      )}
    </>
  );
}

function Group({
  title,
  items,
  says,
}: {
  title: string;
  items: any[];
  says: Record<string, string>;
}) {
  if (!items.length) return null;

  return (
    <section className="mt-8">
      <h2 className="mono-tag mb-3">
        {title} <span className="text-bone-500">({items.length})</span>
      </h2>
      <ul className="card divide-y divide-ink-600">
        {items.map((t) => (
          <li key={t.id}>
            <Link
              href={`/portal/support/${t.id}`}
              className="flex flex-wrap items-start justify-between gap-3 p-4 transition-colors hover:bg-ink-800/40"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-bone-100">{t.subject}</p>
                <p className="mono-tag mt-1 text-[10px]">
                  {fmtDate(t.created_at)}
                  {t.projects?.name ? ` · ${t.projects.name}` : ""}
                </p>
                {/* Said in the client's terms. "in_progress" is our word. */}
                {!t.first_response_at && t.status === "open" && (
                  <p className="mt-1 text-xs text-bone-400">
                    Received — we have not replied yet.
                  </p>
                )}
              </div>
              <Badge>{says[t.status] ?? t.status}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
