import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { PageHead, Badge, Stat } from "@/components/admin/ui";
import { fmtDateTime, TZ_LABEL } from "@/lib/datetime";
import MeetingsClient, { MeetingActions, MeetingNotes } from "@/components/admin/MeetingsClient";
import { CalendarClock, Video, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { meetingProvider } from "@/lib/meetings";
import { externalUrl } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Meetings" };
export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const db = createAdminClient();
  const me = await getCurrentStaff();
  const canManage = me?.role === "owner" || me?.role === "admin";

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

  const [{ data: meetings, error }, { data: clients }, { data: projects }, { data: employees }, { data: assignments }] =
    await Promise.all([
      q,
      canManage
        ? db.from("clients").select("id, name, company").eq("is_active", true).order("name")
        : Promise.resolve({ data: [] as any[] }),
      canManage
        ? db.from("projects").select("id, name, client_id").order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      canManage
        ? db.from("employees").select("id, full_name, job_title").ilike("status", "active").order("full_name")
        : Promise.resolve({ data: [] as any[] }),
      canManage
        ? db.from("client_employee_assignments").select("client_id, employee_id")
        : Promise.resolve({ data: [] as any[] }),
    ]);

  if (error?.code === "42P01") {
    return (
      <>
        <PageHead title="Meetings" sub="Not set up yet." />
        <p className="card p-8 text-center text-sm text-bone-300">
          Run <code className="text-lime-400">supabase/idempotent_fixes_2027_37.sql</code> to
          create the meetings table.
        </p>
      </>
    );
  }

  // Format employees with assigned client IDs for priority dropdown sorting
  const assignmentMap = new Map<string, string[]>();
  (assignments ?? []).forEach((a: any) => {
    const prev = assignmentMap.get(a.employee_id) || [];
    assignmentMap.set(a.employee_id, [...prev, a.client_id]);
  });

  const formattedEmployees = (employees ?? []).map((e: any) => ({
    id: e.id,
    full_name: e.full_name,
    job_title: e.job_title,
    assigned_client_ids: assignmentMap.get(e.id) || [],
  }));

  const now = Date.now();
  const rows = meetings ?? [];

  const upcoming = rows
    .filter((m: any) => m.status === "scheduled" && +new Date(m.starts_at) >= now)
    .reverse();
  const completed = rows.filter(
    (m: any) => m.status === "scheduled" && +new Date(m.starts_at) < now
  );
  const cancelledMeetings = rows.filter((m: any) => m.status === "cancelled");

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

      {/* Summary Analytics Bar */}
      <div className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Meetings" value={String(rows.length)} hint="All time booked calls" />
        <Stat label="Upcoming / Booked" value={String(upcoming.length)} hint="Scheduled calls" tone="good" />
        <Stat label="Completed / Done" value={String(completed.length)} hint="Successfully held" />
        <Stat label="Cancelled" value={String(cancelledMeetings.length)} hint="Removed calls" tone="warn" />
      </div>

      {canManage && (
        <div className="mb-8">
          <MeetingsClient
            clients={clients ?? []}
            projects={projects ?? []}
            employees={formattedEmployees}
          />
        </div>
      )}

      <Section
        title="Upcoming & Scheduled Meetings"
        items={upcoming}
        canManage={canManage}
        empty="No upcoming meetings booked."
        icon={<Clock size={16} className="text-lime-400" />}
      />

      <Section
        title="Completed Meetings (Meeting Done)"
        items={completed}
        canManage={canManage}
        empty="No completed meetings yet."
        icon={<CheckCircle2 size={16} className="text-lime-400" />}
      />

      <Section
        title="Cancelled Meetings"
        items={cancelledMeetings}
        canManage={canManage}
        empty="No cancelled meetings."
        icon={<XCircle size={16} className="text-rose-400" />}
      />
    </>
  );
}

function Section({
  title,
  items,
  canManage,
  empty,
  icon,
}: {
  title: string;
  items: any[];
  canManage: boolean;
  empty: string;
  icon?: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mono-tag mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title} <span className="text-bone-500">({items.length})</span>
      </h2>

      {!items.length ? (
        <p className="card p-6 text-center text-sm text-bone-400">{empty}</p>
      ) : (
        <div className="card divide-y divide-ink-600">
          {items.map((m: any) => {
            const cancelled = m.status === "cancelled";
            const isPast = +new Date(m.starts_at) < Date.now();
            const provider = meetingProvider(m.join_url);
            const safeJoinUrl = m.join_url ? externalUrl(m.join_url) : null;

            return (
              <div
                key={m.id}
                className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`font-medium ${cancelled ? "text-bone-400 line-through" : "text-bone-100"}`}
                    >
                      {m.title}
                    </p>
                    {cancelled ? (
                      <Badge>cancelled</Badge>
                    ) : isPast ? (
                      <Badge>completed</Badge>
                    ) : (
                      <Badge>sent</Badge>
                    )}
                  </div>

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
                    <div className="mt-2.5 rounded-lg border border-ink-600/70 bg-ink-800/40 p-2.5">
                      <p className="mono-tag text-[10px] text-bone-400 mb-1 flex items-center gap-1 font-semibold">
                        <FileText size={11} className="text-lime-400" /> Meeting Agenda &amp; Topics
                      </p>
                      <p className="whitespace-pre-line text-xs leading-relaxed text-bone-200">
                        {m.agenda}
                      </p>
                    </div>
                  )}

                  {canManage && isPast && !cancelled && (
                    <div className="mt-2.5">
                      <MeetingNotes
                        meetingId={m.id}
                        notes={m.notes ?? ""}
                      />
                    </div>
                  )}
                  {!canManage && m.notes && (
                    <div className="mt-2.5 rounded-lg border border-lime-400/30 bg-lime-950/10 p-2.5">
                      <p className="mono-tag text-[10px] text-lime-400 mb-1 font-semibold">
                        Post-Meeting Notes &amp; Decisions
                      </p>
                      <p className="whitespace-pre-line text-xs leading-relaxed text-bone-200">
                        {m.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {/* Join button ONLY rendered if meeting is upcoming (not past and not cancelled) */}
                  {safeJoinUrl && !cancelled && !isPast && (
                    <a
                      href={safeJoinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mono-tag inline-flex items-center gap-1.5 rounded-lg border border-lime-400/40 bg-lime-400/10 px-3 py-1 text-xs text-lime-400 hover:bg-lime-400/20 hover:underline"
                    >
                      <Video size={13} /> Join Call
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
