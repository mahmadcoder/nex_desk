import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";
import { loadMeetings } from "@/lib/portal/data";
import { fmtDateTime, TZ_LABEL, daysUntil } from "@/lib/datetime";
import { CalendarClock, Video, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge, Stat } from "@/components/admin/ui";
import { meetingProvider } from "@/lib/meetings";
import { externalUrl } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";
export const metadata = { title: "Meetings" };

export default async function PortalMeetings() {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const meetings = await loadMeetings(session.client.id);
  const now = Date.now();

  const upcoming = meetings
    .filter((m: any) => m.status === "scheduled" && +new Date(m.starts_at) >= now)
    .sort((a: any, b: any) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const completed = meetings.filter(
    (m: any) => m.status === "scheduled" && +new Date(m.starts_at) < now
  );
  const cancelledMeetings = meetings.filter((m: any) => m.status === "cancelled");

  return (
    <>
      <header className="border-b border-ink-600 pb-6">
        <p className="mono-tag text-lime-400">Meetings</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-bone-50">
          Calls with your team.
        </h1>
        <p className="mt-2 text-sm text-bone-300">
          All times shown in {TZ_LABEL}. Every booking also arrives by email with a calendar
          invite attached.
        </p>
      </header>

      {/* Summary Analytics Cards */}
      <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Meetings" value={String(meetings.length)} hint="All time booked calls" />
        <Stat label="Upcoming / Booked" value={String(upcoming.length)} hint="Scheduled calls" tone="good" />
        <Stat label="Completed / Done" value={String(completed.length)} hint="Successfully held" />
        <Stat label="Cancelled" value={String(cancelledMeetings.length)} hint="Removed calls" tone="warn" />
      </div>

      {!meetings.length && (
        <section className="card mt-8 p-8 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-lime-400" aria-hidden />
          <p className="mt-4 text-sm text-bone-200">No meetings scheduled.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-bone-400">
            When we book a call it appears here with the join link.
          </p>
        </section>
      )}

      {!!upcoming.length && (
        <section className="mt-8">
          <h2 className="mono-tag mb-3 flex items-center gap-2 font-semibold">
            <Clock size={16} className="text-lime-400" />
            Upcoming &amp; Scheduled Calls ({upcoming.length})
          </h2>
          <div className="space-y-3">
            {upcoming.map((m: any) => (
              <MeetingRow key={m.id} m={m} highlight />
            ))}
          </div>
        </section>
      )}

      {!!completed.length && (
        <section className="mt-8">
          <h2 className="mono-tag mb-3 flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} className="text-lime-400" />
            Completed Meetings (Meeting Done) ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map((m: any) => (
              <MeetingRow key={m.id} m={m} />
            ))}
          </div>
        </section>
      )}

      {!!cancelledMeetings.length && (
        <section className="mt-8">
          <h2 className="mono-tag mb-3 flex items-center gap-2 font-semibold">
            <XCircle size={16} className="text-rose-400" />
            Cancelled Meetings ({cancelledMeetings.length})
          </h2>
          <div className="space-y-3">
            {cancelledMeetings.map((m: any) => (
              <MeetingRow key={m.id} m={m} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function MeetingRow({ m, highlight }: { m: any; highlight?: boolean }) {
  const cancelled = m.status === "cancelled";
  const isPast = +new Date(m.starts_at) < Date.now();
  const days = daysUntil(m.starts_at);
  const provider = meetingProvider(m.join_url);
  const safeJoinUrl = m.join_url ? externalUrl(m.join_url) : null;

  return (
    <div
      className={`card p-5 ${highlight && !cancelled ? "border-lime-400/25" : ""} ${
        cancelled ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`text-base font-medium ${
                cancelled ? "text-bone-400 line-through" : "text-bone-50"
              }`}
            >
              {m.title}
            </h3>
            {cancelled ? (
              <Badge>cancelled</Badge>
            ) : isPast ? (
              <Badge>completed</Badge>
            ) : (
              <Badge>sent</Badge>
            )}
          </div>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-bone-200">
            <CalendarClock size={13} className="text-lime-400" aria-hidden />
            {fmtDateTime(m.starts_at)} · {m.duration_min} min
            {highlight && !cancelled && days !== null && days >= 0 && (
              <span className="mono-tag text-[11px] text-lime-400">
                {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
              </span>
            )}
          </p>

          <p className="mono-tag mt-1 flex flex-wrap items-center gap-x-2 text-[10px]">
            {m.projects?.name && <span>{m.projects.name}</span>}
            {provider && <span className={provider.tone}>{provider.label}</span>}
          </p>

          {m.agenda && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-bone-300">
              {m.agenda}
            </p>
          )}

          {m.notes && (
            <div className="mt-3 rounded-lg border border-ink-600 bg-ink-800/50 p-3">
              <p className="mono-tag mb-1 text-[10px] text-lime-400">What we agreed / Call Notes</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-bone-200">
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
              className="btn btn-primary h-9 gap-1.5 px-4 text-sm"
            >
              <Video size={14} /> Join Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
