import Link from "next/link";
import { getPortalSession } from "@/lib/portal/session";
import { loadProjects, loadBilling, loadDocuments, loadMeetings } from "@/lib/portal/data";
import { buildActivity } from "@/lib/portal/activity";
import { moneyMulti, money } from "@/lib/utils";
import { fmtDate, fmtDateTime, daysUntil } from "@/lib/datetime";
import ProjectCard from "@/components/portal/ProjectCard";
import ReturnRequest from "@/components/portal/ReturnRequest";
import {
  FolderKanban,
  PackageCheck,
  Receipt,
  Wallet,
  CalendarClock,
  ArrowRight,
  CircleDot,
} from "lucide-react";
import { getUpcomingHolidays } from "@/lib/holidays";
import HolidayNoticeBanner from "@/components/ui/HolidayNoticeBanner";
import LiveClockGreeting from "@/components/ui/LiveClockGreeting";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";

/**
 * The portal's landing page.
 *
 * Was 714 lines holding every screen at once. It is now a summary that points
 * at the routes beside it — a client should be able to answer "where are we?"
 * without scrolling.
 */
export default async function PortalDashboard() {
  const session = await getPortalSession();

  if (!session) {
    return (
      <div className="card mx-auto mt-12 max-w-md p-10 text-center">
        <h1 className="text-2xl font-semibold">No project profile found</h1>
        <p className="mt-3 text-sm text-bone-300">
          Your account is not currently attached to an active client profile. If you believe
          this is an error, please reach out to your Nex Desk representative.
        </p>
        <Link href="/" className="btn mt-6 inline-flex">
          Return to Homepage
        </Link>
      </div>
    );
  }

  const { client, isPaused, perms } = session;

  const [{ projects, milestones, teamFor }, billing, documents, meetings, holidays] = await Promise.all([
    loadProjects(client.id),
    loadBilling(client.id),
    loadDocuments(client.id),
    loadMeetings(client.id, { upcomingOnly: true }),
    getUpcomingHolidays(),
  ]);

  const active = projects.filter(
    (p: any) => !["completed", "cancelled", "delivered"].includes(String(p.status))
  );
  const completed = projects.filter((p: any) =>
    ["completed", "delivered"].includes(String(p.status))
  );
  const pendingInvoices = billing.invoices.filter((i: any) => i.status !== "paid");

  const activity = buildActivity(
    { projects, milestones, invoices: billing.invoices, documents },
    { limit: 6 }
  );

  // Only what actually needs them. An empty "nothing to do" panel is noise.
  const unsigned = billing.deals.filter((d: any) => !d.accepted_at);
  const overdue = pendingInvoices.filter(
    (i: any) => i.due_date && new Date(i.due_date) < new Date()
  );
  const firstVisit = Number(client.portal_login_count ?? 0) <= 1;

  return (
    <>
      <LiveClockGreeting
        name={client.name}
        role="client"
        subText={client.company ? `${client.company} · Client Portal` : "Client Portal"}
        className="mb-6"
      />

      {/* ── Welcome ── */}
      <header className="border-b border-ink-600 pb-6">
        <p className="mono-tag text-lime-400">Client portal</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-bone-50">
          {firstVisit ? "Welcome" : "Welcome back"},{" "}
          {String(client.name || "").trim().split(/\s+/)[0] || client.name}.
        </h1>
        <p className="mt-2 text-sm text-bone-300">
          {client.company ? `${client.company} · ` : ""}
          {firstVisit
            ? "Everything about your project lives here — progress, invoices and documents."
            : "Here is where everything stands right now."}
        </p>
      </header>

      <div className="mt-6">
        <HolidayNoticeBanner holidays={holidays} />
      </div>

      {isPaused && (
        <section className="card mt-8 border-lime-400/25 bg-lime-400/[0.04] p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-xl">
              <span className="mono-tag text-xs text-lime-400">Account paused</span>
              <h2 className="mt-2 text-lg font-semibold text-bone-50">
                We are not working on anything for you right now.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-bone-300">
                Everything from our work together stays here — invoices, receipts, documents
                and the full history — and it is yours to download at any time. New requests
                and uploads are switched off while things are paused. Whenever you want to
                start something again, tell us here and we will pick it straight back up.
              </p>
            </div>
            <ReturnRequest
              clientName={String(client.name ?? "")}
              alreadyRequested={!!client.return_requested_at}
            />
          </div>
        </section>
      )}

      {/* ── Needs you ── rendered only when something does. */}
      {(unsigned.length > 0 || overdue.length > 0) && (
        <section className="card mt-8 border-amber-400/30 bg-amber-400/[0.04] p-5 sm:p-6">
          <p className="mono-tag text-amber-300">Waiting on you</p>
          <ul className="mt-3 space-y-2 text-sm">
            {unsigned.map((d: any) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 text-bone-200">
                <CircleDot size={13} className="shrink-0 text-amber-300" aria-hidden />
                Agreement {d.deal_no} for {money(Number(d.total), d.currency)} is ready to sign.
                <Link href="/portal/account" className="text-lime-400 hover:underline">
                  Review it →
                </Link>
              </li>
            ))}
            {overdue.map((i: any) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 text-bone-200">
                <CircleDot size={13} className="shrink-0 text-amber-300" aria-hidden />
                Invoice {i.invoice_no} was due {fmtDate(i.due_date)}.
                <Link href="/portal/invoices" className="text-lime-400 hover:underline">
                  View it →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Tiles ── */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          icon={FolderKanban}
          label="Active projects"
          value={String(active.length)}
          href="/portal/projects"
        />
        <Tile icon={PackageCheck} label="Completed projects" value={String(completed.length)} />
        {perms.show_invoices && (
          <Tile
            icon={Receipt}
            label="Pending invoices"
            value={String(pendingInvoices.length)}
            href="/portal/invoices"
          />
        )}
        {perms.show_financials && (
          <Tile
            icon={Wallet}
            label="Amount due"
            value={billing.totalOwed.length ? moneyMulti(billing.totalOwed) : "Settled"}
            tone={billing.totalOwed.length ? "warn" : "good"}
          />
        )}
      </section>

      {/* ── Active projects ── */}
      {active.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-medium text-bone-50">Active projects</h2>
            <Link
              href="/portal/projects"
              className="mono-tag inline-flex items-center gap-1.5 text-lime-400 hover:underline"
            >
              All projects <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {active.slice(0, 2).map((p: any) => (
              <ProjectCard key={p.id} project={p} team={teamFor(p.id)} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* ── Recent activity ── */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-medium text-bone-50">Recent activity</h2>
          {activity.length ? (
            <ul className="mt-4 space-y-3.5">
              {activity.map((a, i) => (
                <li key={`${a.kind}-${a.at}-${i}`} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-400" />
                  <div className="min-w-0">
                    <p className="text-bone-200">{a.title}</p>
                    <p className="mono-tag text-[10px]">
                      {fmtDate(a.at)}
                      {a.detail ? ` · ${a.detail}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-bone-400">
              Nothing yet. As soon as work starts moving it shows up here.
            </p>
          )}
        </section>

        {/* ── Upcoming meetings ── */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock size={15} className="text-lime-400" aria-hidden />
              <h2 className="text-base font-medium text-bone-50">Upcoming meetings</h2>
            </div>
            {meetings.length > 0 && (
              <Link href="/portal/meetings" className="mono-tag text-lime-400 hover:underline">
                All
              </Link>
            )}
          </div>

          {meetings.length ? (
            <ul className="mt-4 space-y-3.5">
              {meetings.slice(0, 4).map((m: any) => {
                const days = daysUntil(m.starts_at);
                return (
                  <li key={m.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-bone-100">{m.title}</p>
                      <p className="mono-tag text-[10px]">
                        {fmtDateTime(m.starts_at)} · {m.duration_min} min
                        {days !== null && days >= 0
                          ? days === 0
                            ? " · today"
                            : days === 1
                              ? " · tomorrow"
                              : ` · in ${days} days`
                          : ""}
                      </p>
                    </div>
                    {m.join_url && (
                      <a
                        href={m.join_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mono-tag shrink-0 text-lime-400 hover:underline"
                      >
                        Join
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-bone-400">
              No meetings scheduled. When we book a call it appears here with a join link, and
              you get an email you can add straight to your calendar.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  href,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  href?: string;
  tone?: "warn" | "good";
}) {
  const body = (
    <div className="card h-full p-5 transition-colors hover:border-lime-400/30">
      <div className="mono-tag mb-2 flex items-center gap-1.5 text-[10px]">
        <Icon size={12} className="text-lime-400" aria-hidden />
        {label}
      </div>
      <p
        className={`font-mono text-2xl ${
          tone === "warn" ? "text-amber-400" : tone === "good" ? "text-lime-400" : "text-bone-50"
        }`}
      >
        {value}
      </p>
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
