import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";
import { loadProjects, loadProjectFileGroups } from "@/lib/portal/data";
import { createAdminClient } from "@/lib/supabase/server";
import { buildActivity } from "@/lib/portal/activity";
import { externalUrl } from "@/lib/utils";
import { fmtDate } from "@/lib/datetime";
import { describeMetrics } from "@/config/logFields";
import { Badge } from "@/components/admin/ui";
import Avatar from "@/components/Avatar";
import SupportWindow from "@/components/SupportWindow";
import ApproveMilestone from "@/components/portal/ApproveMilestone";
import KickoffChecklist from "@/components/portal/KickoffChecklist";
import ClientChangeRequest from "@/components/portal/ClientChangeRequest";
import ProjectTabs, { type TabKey } from "@/components/portal/ProjectTabs";
import MessageThread from "@/components/MessageThread";
import { listMessages } from "@/lib/actions/messages";
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  ExternalLink,
  CalendarDays,
  AlertTriangle,
  Flag,
  ChevronRight,
  Paperclip,
  Download,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";

const TABS: TabKey[] = [
  "overview",
  "timeline",
  "files",
  "tasks",
  "milestones",
  "messages",
  "notes",
];

/**
 * One project, in tabs.
 *
 * The tab lives in `?tab=` rather than component state so a client can bookmark
 * "my milestones", the back button works, and we can link them straight to the
 * right place from an email.
 */
export default async function PortalProject({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;

  const session = await getPortalSession();
  if (!session) redirect("/portal");
  const { client, isPaused, perms } = session;

  const { projects, milestones, updates, changeRequests, teamFor } = await loadProjects(client.id);

  // Scoped to this client's own projects — an id from another client must 404,
  // not render.
  const project = projects.find((p: any) => p.id === id);
  if (!project) notFound();

  const tab: TabKey = (TABS as string[]).includes(rawTab ?? "") ? (rawTab as TabKey) : "overview";

  const team = teamFor(project.id);
  const ms = milestones.filter((m: any) => m.project_id === project.id);
  const logs = updates.filter((u: any) => u.project_id === project.id);
  const openRequests = changeRequests.filter((c: any) => c.project_id === project.id);

  // Only tasks the team has not marked internal. Enforced here, not in the UI —
  // `is_internal` is the control.
  const { data: tasks } = await createAdminClient()
    .from("tasks")
    .select("id, title, status, due_date, sort_order")
    .eq("project_id", project.id)
    .eq("is_internal", false)
    .eq("is_recurring_template", false)
    .order("sort_order");

  // Only for the tab actually being rendered — a client on Overview should not
  // pay for signing every file URL.
  const fileGroups = tab === "files" ? await loadProjectFileGroups(project.id, { clientView: true }) : [];
  const messages = tab === "messages" ? await listMessages(project.id) : [];

  // `task_status` is backlog | todo | doing | review | done, which maps onto
  // the three groups a client actually asks about.
  const taskGroups = {
    current: (tasks ?? []).filter((t: any) => ["doing", "review"].includes(t.status)),
    upcoming: (tasks ?? []).filter((t: any) => ["todo", "backlog"].includes(t.status)),
    completed: (tasks ?? []).filter((t: any) => t.status === "done"),
  };

  const timeline = buildActivity(
    { projects: [project], milestones: ms },
    { limit: 0, projectId: project.id }
  );

  const progress = Math.max(0, Math.min(100, Number(project.progress ?? 0)));
  const stack: string[] = project.tech_stack ?? [];
  const slipping =
    !!project.deadline &&
    !!project.estimated_delivery &&
    new Date(project.estimated_delivery) > new Date(project.deadline);

  return (
    <>
      <Link
        href="/portal/projects"
        className="mono-tag inline-flex items-center gap-1.5 text-bone-400 hover:text-lime-400"
      >
        <ArrowLeft size={12} /> All projects
      </Link>

      <header className="mt-4 border-b border-ink-600 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold leading-tight text-bone-50">{project.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge>{String(project.status).replace(/_/g, " ")}</Badge>
              <span className="inline-flex items-center gap-1 rounded-full border border-ink-600 bg-ink-800 px-2 py-0.5 text-[11px] capitalize text-bone-300">
                <Flag size={10} aria-hidden /> {String(project.priority ?? "normal")}
              </span>
            </div>
          </div>

          {perms.show_staging &&
            (externalUrl(project.staging_url) || externalUrl(project.live_url)) && (
              <div className="flex flex-wrap gap-2">
                {externalUrl(project.staging_url) && (
                  <a
                    href={externalUrl(project.staging_url)!}
                    target="_blank"
                    rel="noreferrer"
                    className={`btn h-10 gap-2 px-5 text-sm ${project.live_url ? "" : "btn-primary"}`}
                  >
                    Staging preview <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {externalUrl(project.live_url) && (
                  <a
                    href={externalUrl(project.live_url)!}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary h-10 gap-2 px-5 text-sm"
                  >
                    Visit your live site <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="mono-tag">Progress</span>
            <span className="font-medium text-bone-200">{progress}%</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-ink-700"
            role="img"
            aria-label={`${progress} percent complete`}
          >
            <div
              className="h-full rounded-full bg-lime-400 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <ProjectTabs projectId={project.id} active={tab} milestoneCount={ms.length} />

      <div className="mt-6">
        {tab === "overview" && (
          <div className="space-y-6">
            <section className="card p-5 sm:p-6">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Started" value={project.start_date ? fmtDate(project.start_date) : "—"} />
                <Field
                  label="Deadline"
                  value={project.deadline ? fmtDate(project.deadline) : "—"}
                  icon={<CalendarDays size={13} className="text-bone-400" aria-hidden />}
                />
                <Field
                  label="Estimated delivery"
                  value={project.estimated_delivery ? fmtDate(project.estimated_delivery) : "—"}
                  tone={slipping ? "warn" : undefined}
                  icon={
                    slipping ? <AlertTriangle size={13} className="text-amber-300" aria-hidden /> : null
                  }
                />
                <Field label="Priority" value={String(project.priority ?? "normal")} />
              </div>

              {slipping && (
                <p className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] p-3 text-xs leading-relaxed text-amber-200">
                  This is currently tracking past the agreed deadline. The deadline on your
                  agreement has not changed — this is our honest current estimate, and we would
                  rather you saw it here than found out on the day.
                </p>
              )}

              {stack.length > 0 && (
                <div className="mt-6 border-t border-ink-700 pt-5">
                  <p className="mono-tag mb-2 text-[10px]">Built with</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stack.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-ink-600 bg-ink-800 px-2.5 py-1 text-xs text-bone-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {team.length > 0 && (
                <div className="mt-6 border-t border-ink-700 pt-5">
                  <p className="mono-tag mb-3 text-[10px]">Your team</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {team.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-2.5">
                        <Avatar name={m.full_name} src={m.avatar_url} size="sm" />
                        {/* min-w-0 + truncate: a long job title used to stretch
                            the row rather than shorten itself. */}
                        <div className="min-w-0">
                          <p className="truncate text-sm text-bone-100">{m.full_name}</p>
                          {m.job_title && (
                            <p className="mono-tag truncate text-[10px]">{m.job_title}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Where the free-fix period stands. Directly above the change
                request on purpose — this is the line between a bug we owe you
                and new work we quote for. */}
            <SupportWindow project={project} />

            {Array.isArray(project.kickoff_items) && project.kickoff_items.length > 0 && (
              <KickoffChecklist projectId={project.id} items={project.kickoff_items} />
            )}

            {!isPaused && (
              <ClientChangeRequest
                projectId={project.id}
                projectName={project.name}
                openRequests={openRequests}
              />
            )}
          </div>
        )}

        {tab === "timeline" && (
          <section className="card p-5 sm:p-6">
            <h2 className="text-base font-medium text-bone-50">What has happened</h2>

            {!!logs.length && (
              <ol className="mt-5 space-y-0">
                {logs.map((u: any, i: number) => (
                  <li key={u.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < logs.length - 1 && (
                      <span
                        className="absolute bottom-0 left-[5px] top-4 w-px bg-ink-600"
                        aria-hidden
                      />
                    )}
                    <span
                      className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-lime-400"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="mono-tag text-[11px] text-lime-400">
                          {fmtDate(u.work_date)}
                        </span>
                        {u.employee_name && (
                          <span className="text-[11px] text-bone-300">{u.employee_name}</span>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-bone-200">
                        {u.tasks_completed}
                      </p>
                      {/* Concrete numbers beat "worked on SEO" every time. */}
                      {!!describeMetrics(u.metrics).length && (
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                          {describeMetrics(u.metrics).map((m) => (
                            <span key={m.label} className="mono-tag text-[11px]">
                              {m.label}: <strong className="text-bone-100">{m.value}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {!!timeline.length && (
              <ul className="mt-6 space-y-3 border-t border-ink-700 pt-5">
                {timeline.map((a, i) => (
                  <li key={`${a.kind}-${i}`} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bone-500" />
                    <div>
                      <p className="text-bone-200">{a.title}</p>
                      <p className="mono-tag text-[10px]">{fmtDate(a.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!logs.length && !timeline.length && (
              <p className="mt-3 text-sm text-bone-400">
                Nothing recorded yet. Updates from the team appear here as work happens.
              </p>
            )}
          </section>
        )}

        {tab === "tasks" && (
          <section className="card p-5 sm:p-6">
            <h2 className="text-base font-medium text-bone-50">Tasks</h2>
            <p className="mt-1 text-xs text-bone-400">
              The work items on this project, read-only. Internal planning is not shown.
            </p>

            {tasks?.length ? (
              <div className="mt-5 space-y-6">
                <TaskGroup title="Current" tasks={taskGroups.current} />
                <TaskGroup title="Upcoming" tasks={taskGroups.upcoming} />
                {/* Collapsed by default — a long project would otherwise open
                    on two hundred finished items before the live work. */}
                {taskGroups.completed.length > 0 && (
                  <details className="group">
                    <summary className="mono-tag flex items-center gap-1.5 text-bone-300 hover:text-bone-100">
                      <ChevronRight
                        size={12}
                        className="transition-transform group-open:rotate-90"
                        aria-hidden
                      />
                      Completed ({taskGroups.completed.length})
                    </summary>
                    <div className="mt-3">
                      <TaskList tasks={taskGroups.completed} />
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-bone-400">No tasks to show yet.</p>
            )}
          </section>
        )}

        {tab === "milestones" && (
          <section className="card p-5 sm:p-6">
            <h2 className="text-base font-medium text-bone-50">Milestones</h2>
            {!perms.show_milestones ? (
              <p className="mt-3 text-sm text-bone-400">Milestones are not shown on your account.</p>
            ) : ms.length ? (
              <ul className="mt-5 divide-y divide-ink-600 rounded-lg border border-ink-600 bg-ink-900/40">
                {ms.map((m: any) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      {m.is_done ? (
                        <CheckCircle className="h-4 w-4 shrink-0 text-lime-400" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-bone-300" />
                      )}
                      <span className={m.is_done ? "text-bone-300 line-through" : "text-bone-100"}>
                        {m.title}
                      </span>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      {m.due_date && !m.is_done && (
                        <span className="mono-tag text-xs text-bone-300">{fmtDate(m.due_date)}</span>
                      )}
                      {/* Sign-off becomes a recorded click, not a WhatsApp
                          message. Only offered once the team marks it done. */}
                      {m.is_done && (
                        <ApproveMilestone milestoneId={m.id} approvedAt={m.approved_at ?? null} />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-bone-400">No milestones set on this project.</p>
            )}
          </section>
        )}

        {tab === "notes" && (
          <section className="card p-5 sm:p-6">
            <h2 className="text-base font-medium text-bone-50">Notes</h2>
            {project.client_notes ? (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-bone-200">
                {project.client_notes}
              </p>
            ) : (
              <p className="mt-3 text-sm text-bone-400">
                Nothing noted yet. Anything we want you to know outside the day-to-day updates
                lands here.
              </p>
            )}
          </section>
        )}

        {tab === "files" && (
          <section className="card p-5 sm:p-6">
            <h2 className="text-base font-medium text-bone-50">Files</h2>
            <p className="mt-1 text-xs text-bone-400">
              Everything for this project, grouped by what it is — your proposal and contract
              alongside the design files and assets.
            </p>

            {fileGroups.length ? (
              <div className="mt-5 space-y-6">
                {fileGroups.map(({ group, files: groupFiles }) => (
                  <div key={group}>
                    <p className="mono-tag mb-2">
                      {group} <span className="text-bone-500">({groupFiles.length})</span>
                    </p>
                    <ul className="divide-y divide-ink-600 rounded-lg border border-ink-600 bg-ink-900/40">
                      {groupFiles.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between gap-4 px-3.5 py-3 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Paperclip size={13} className="shrink-0 text-bone-400" aria-hidden />
                            <div className="min-w-0">
                              <p className="truncate text-bone-100">{f.name}</p>
                              <p className="mono-tag text-[10px]">
                                {fmtDate(f.createdAt)}
                                {f.generated ? " · generated by us" : ""}
                              </p>
                            </div>
                          </div>
                          {f.url && (
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mono-tag inline-flex shrink-0 items-center gap-1 text-[11px] text-lime-400 hover:underline"
                            >
                              <Download size={12} /> Download
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-bone-400">Nothing shared with you yet.</p>
            )}
          </section>
        )}

        {tab === "messages" && (
          <section className="card p-5 sm:p-6">
            <h2 className="text-base font-medium text-bone-50">Messages</h2>
            <p className="mt-1 text-xs text-bone-400">
              Anything written here stays attached to this project — unlike WhatsApp, it is
              still findable in six months.
            </p>
            <div className="mt-5">
              <MessageThread
                projectId={project.id}
                side="client"
                messages={messages}
                readOnly={isPaused}
                readOnlyReason="Your account is paused, so this thread is read-only. Everything written before stays here."
              />
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function TaskGroup({ title, tasks }: { title: string; tasks: any[] }) {
  // An empty "Upcoming" heading tells a client nothing they need.
  if (!tasks.length) return null;
  return (
    <div>
      <p className="mono-tag mb-2">
        {title} <span className="text-bone-500">({tasks.length})</span>
      </p>
      <TaskList tasks={tasks} />
    </div>
  );
}

function TaskList({ tasks }: { tasks: any[] }) {
  return (
    <ul className="divide-y divide-ink-600 rounded-lg border border-ink-600 bg-ink-900/40">
      {tasks.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-4 px-3.5 py-3 text-sm">
          <div className="flex min-w-0 items-center gap-3">
            {t.status === "done" ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-lime-400" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-bone-400" />
            )}
            <span
              className={`truncate ${
                t.status === "done" ? "text-bone-400 line-through" : "text-bone-100"
              }`}
            >
              {t.title}
            </span>
          </div>
          <span className="flex shrink-0 items-center gap-2">
            {t.due_date && t.status !== "done" && (
              <span className="mono-tag text-[10px]">{fmtDate(t.due_date)}</span>
            )}
            <Badge>{String(t.status).replace(/_/g, " ")}</Badge>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Field({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "warn";
}) {
  return (
    <div>
      <p className="mono-tag text-[10px]">{label}</p>
      <p
        className={`mt-1 flex items-center gap-1.5 text-sm capitalize ${
          tone === "warn" ? "text-amber-300" : "text-bone-200"
        }`}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}
