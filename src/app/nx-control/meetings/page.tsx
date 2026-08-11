import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { assignedClientIds } from "@/lib/auth/staff";
import { PageHead, Badge } from "@/components/admin/ui";
import { fmtDateTime, TZ_LABEL } from "@/lib/datetime";
import MeetingsClient, { MeetingActions, MeetingNotes } from "@/components/admin/MeetingsClient";
import { CalendarClock, Video } from "lucide-react";
import { meetingProvider } from "@/lib/meetings";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Meetings" };
export const dynamic = "force-dynamic";

/**
 * Meetings, for whoever is looking.
 *
 * Owner/admin see and book everything. **Staff see only the clients they are
 * assigned to and cannot book** — the same rule that governs their client list,
 * enforced here in the query rather than by hiding a button.
 */
export default async function MeetingsPage() {
  const db = createAdminClient();
  const me = await getCurrentStaff();
  const canManage = me?.role === "owner" || me?.role === "admin";

  // Fails closed: an employee with no assignments sees nothing, never
  // everything.
  const mine = canManage ? null : await assignedClientIds(me?.employeeId ?? null);

  let q = db
    .from("meetings")
    .select("*, clients(id, name, company), projects(id, name)")
    .order("starts_at", { ascending: false })
    .limit(100);

  if (mine) {
    if (!mine.length) {
      return (
        <>
          <PageHead title="My meetings" sub="Calls with the clients you are assigned to." />
          <p className="card p-8 text-center text-sm text-bone-300">
            You are not assigned to any clients yet, so there is nothing here.
          </p>
        </>
      );
    }
    q = q.in("client_id", mine);
  }

  const [{ data: meetings, error }, { data: clients }, { data: projects }] = await Promise.all([
    q,
    canManage
      ? db.from("clients").select("id, name, company").eq("is_active", true).order("name")
      : Promise.resolve({ data: [] as any[] }),
    canManage
      ? db.from("projects").select("id, name, client_id").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  if (error?.code === "42P01") {
    return (
      <>
        <PageHead title="Meetings" sub="Not set up yet." />
        <p className="card p-8 text-center text-sm text-bone-300">
          Run <code className="text-lime-400">supabase/idempotent_fixes_2027_24.sql</code> to
          create the meetings table.
        </p>
      </>
    );
  }

  const now = Date.now();
  const rows = meetings ?? [];
  const upcoming = rows
    .filter((m: any) => m.status === "scheduled" && +new Date(m.starts_at) >= now)
    .reverse();
  const past = rows.filter(
    (m: any) => m.status !== "scheduled" || +new Date(m.starts_at) < now
  );

  return (
    <>
      <PageHead
        title={canManage ? "Meetings" : "My meetings"}
        sub={
          canManage
            ? `Calls with clients. Everyone invited gets an email with a calendar invite attached. Times shown in ${TZ_LABEL}.`
            : `Calls with the clients you are assigned to. Times in ${TZ_LABEL}.`
        }
      />

      {canManage && (
        <MeetingsClient clients={clients ?? []} projects={projects ?? []} />
      )}

      <Section title="Upcoming" items={upcoming} canManage={canManage} empty="Nothing booked." />
      <Section title="Past & cancelled" items={past} canManage={canManage} empty="Nothing yet." />
    </>
  );
}

function Section({
  title,
  items,
  canManage,
  empty,
}: {
  title: string;
  items: any[];
  canManage: boolean;
  empty: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="mono-tag mb-3">
        {title} <span className="text-bone-500">({items.length})</span>
      </h2>

      {!items.length ? (
        <p className="card p-6 text-center text-sm text-bone-400">{empty}</p>
      ) : (
        <div className="card divide-y divide-ink-600">
          {items.map((m: any) => {
            const cancelled = m.status === "cancelled";
            const provider = meetingProvider(m.join_url);
            const isPast = +new Date(m.starts_at) < Date.now();
            return (
              <div
                key={m.id}
                className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm"
              >
                <div className="min-w-0">
                  <p
                    className={`font-medium ${cancelled ? "text-bone-400 line-through" : "text-bone-100"}`}
                  >
                    {m.title}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-bone-300">
                    <CalendarClock size={12} className="text-lime-400" aria-hidden />
                    {fmtDateTime(m.starts_at)} · {m.duration_min} min
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-bone-400">
                    {provider && <span className={provider.tone}>{provider.label}</span>}
                    {m.clients?.name}
                    {m.clients?.company ? ` · ${m.clients.company}` : ""}
                    {m.projects?.name ? ` · ${m.projects.name}` : ""}
                  </p>
                  {m.agenda && (
                    <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-bone-300">
                      {m.agenda}
                    </p>
                  )}

                  {/* Only on a meeting that has happened. Notes never re-send
                      an invite or bump the sequence — nobody wants a fresh
                      calendar prompt because someone typed up minutes. */}
                  {canManage && isPast && !cancelled && (
                    <MeetingNotes
                      meetingId={m.id}
                      notes={m.notes ?? ""}
                    />
                  )}
                  {!canManage && m.notes && (
                    <p className="mt-2 whitespace-pre-line rounded-lg border border-ink-600 bg-ink-800/50 p-2.5 text-xs leading-relaxed text-bone-200">
                      {m.notes}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge>{m.status}</Badge>
                  {m.join_url && !cancelled && (
                    <a
                      href={m.join_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mono-tag inline-flex items-center gap-1 text-[11px] text-lime-400 hover:underline"
                    >
                      <Video size={11} /> Join
                    </a>
                  )}
                  {canManage && !cancelled && (
                    <MeetingActions meetingId={m.id} title={m.title} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
