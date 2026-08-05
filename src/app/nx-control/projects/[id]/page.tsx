import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { PageHead, Badge, Stat } from "@/components/admin/ui";
import { PackageCheck, Clock } from "lucide-react";
import { money, moneyMulti, sumByCurrency } from "@/lib/utils";
import { describeMetrics } from "@/config/logFields";
import DocButton from "@/components/admin/DocButton";
import MilestoneList from "@/components/admin/MilestoneList";
import ProjectControls from "@/components/admin/ProjectControls";
import SendInvoiceButton from "@/components/admin/SendInvoiceButton";
import HandoverPanel from "@/components/admin/HandoverPanel";
import ChangeRequestsCard from "@/components/admin/ChangeRequestsCard";
import DealExtrasCard from "@/components/admin/DealExtrasCard";
import CredentialsCard from "@/components/admin/CredentialsCard";
import ExpensesCard from "@/components/admin/ExpensesCard";
import TasksCard from "@/components/admin/TasksCard";
import CancelProjectPanel from "@/components/admin/CancelProjectPanel";
import { handoverGate } from "@/lib/delivery/gate";
import { invoiceOriginLabel } from "@/lib/billing";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const dynamic = "force-dynamic";

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentStaff();
  if (!me) return null;

  const canManage = me.isPrivileged;
  const db = createAdminClient();

  const { data: project } = await db.from("projects")
    .select("*, clients(*), deals(*)").eq("id", id).single();
  if (!project) notFound();

  // Staff may only open projects for clients they are assigned to. 404 rather
  // than 403 so the page does not confirm the project exists.
  if (!canManage) {
    const allowed = await assignedClientIds(me.employeeId);
    if (!allowed.includes(project.client_id)) notFound();
  }

  const [
    { data: milestones },
    { data: invoices },
    { data: workLogs },
    { data: changeRequests },
    { data: expenses, error: expensesError },
    { data: tasks, error: tasksError },
    { data: teamList },
  ] = await Promise.all([
      db.from("milestones").select("*").eq("project_id", id).order("sort_order"),
      db.from("invoices").select("*").eq("project_id", id).order("issue_date"),
      db.from("daily_work_logs")
        .select("id, work_date, tasks_completed, blockers, employee_name, client_visible, metrics")
        .eq("project_id", id)
        .order("work_date", { ascending: false })
        .limit(20),
      db.from("change_requests")
        .select("*").eq("project_id", id).order("created_at", { ascending: false }),
      db.from("project_expenses")
        .select("*").eq("project_id", id).order("incurred_on", { ascending: false }),
      db.from("tasks")
        .select("*").eq("project_id", id).order("sort_order").order("created_at"),
      db.from("employees").select("id, full_name").ilike("status", "active").order("full_name"),
    ]);

  // Before the 2027-06 migration this select errors and returns null, which
  // would render as an empty card rather than as the broken thing it is.
  if (expensesError) {
    console.error("Failed to load expenses for project", id, expensesError);
  }

  // Before the 2027-09 migration this select errors and returns null, which
  // would render as "no tasks" rather than as the broken thing it is.
  if (tasksError) {
    console.error("Failed to load tasks for project", id, tasksError);
  }

  const invoiceRows = invoices ?? [];
  const client = project.clients as any;
  const deal = (project.deals as any) ?? null;

  // The gate that decides whether ownership changes hands is defined once, in
  // lib/delivery/gate.ts, and shared with the handover action and the handover
  // PDF. This page used to re-derive it by hand, which is how the three copies
  // drifted apart in the first place.
  const gate = await handoverGate(id);
  const { contract, extras } = gate;

  const contractCurrency: string | null = deal?.currency ?? null;

  // The agreement PLUS every change request they have agreed to buy — which is
  // what `contract.contracted` has meant since agreed changes started counting
  // as contract work. Reading `deal.total` here instead measured payments that
  // included a change request against a total that did not, so a $4,000 deal
  // with a $20 change request, both paid, read "$4,020 / $4,000" — over-paid,
  // when they were exactly square.
  const contractValue = contractCurrency
    ? (contract.contracted.find((t) => t.currency === contractCurrency.toUpperCase())?.total ?? 0)
    : 0;

  // Only money that actually paid a stage of the agreement. Counting every
  // payment on the project meant a domain re-bill read as progress against the
  // contract — and drove this stat, and the gate below, to "settled".
  const paidInContractCurrency = contractCurrency
    ? (contract.paid.find((p) => p.currency === contractCurrency.toUpperCase())?.total ?? 0)
    : 0;

  // How much of the contract figure above is approved change requests rather
  // than the signed agreement. Only used to explain the number on screen.
  const agreedChangeValue = deal ? Math.max(0, contractValue - Number(deal.total)) : 0;

  const outstanding = contract.outstanding;
  const isSettled = deal
    ? contractValue > 0 && outstanding.length === 0
    : invoiceRows.length > 0 && outstanding.length === 0;

  const handoverReasons = gate.reasons;
  const handoverWarnings = gate.warnings;
  const handoverReady = handoverReasons.length === 0;

  return (
    <>
      <Link href={`${BASE}/projects`} className="mono-tag hover:text-bone-50">← projects</Link>

      <PageHead
        title={project.name}
        sub={`${client?.name}${client?.company ? ` · ${client.company}` : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DocButton type="progress_report" id={project.id} label="Progress PDF" />
            {/* Handover itself now lives in its own panel below — it is an event
                that emails three parties and stamps the project, not a download. */}
            {canManage && project.handed_over_at && (
              <span className="mono-tag inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 text-[11px] font-semibold text-emerald-300">
                <PackageCheck size={12} /> Handed over
              </span>
            )}
          </div>
        }
      />

      <div className={`grid gap-4 ${canManage ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        <Stat label="Progress" value={`${project.progress}%`} tone="good" />
        <Stat label="Status" value={String(project.status).replace(/_/g, " ")} />
        <Stat label="Deadline" value={project.deadline ?? "—"} />
        {canManage && (
          <Stat
            label={deal ? "Paid of contract" : "Paid of billed"}
            value={
              deal
                ? `${money(paidInContractCurrency, contractCurrency!)} / ${money(contractValue, contractCurrency!)}`
                : `${moneyMulti(contract.paid, "—")} / ${moneyMulti(contract.billed, "—")}`
            }
            // Extras are shown beside the contract, never inside it. Folding
            // them in is what made a paid domain look like a paid milestone.
            hint={
              // Why the total is not the deal figure. Without this, an agreed
              // change request makes the contract look like it was typed wrong.
              agreedChangeValue > 0
                ? `${money(Number(deal.total), contractCurrency!)} agreed + ${money(agreedChangeValue, contractCurrency!)} of changes they approved`
                : extras.billed.length
                ? `Plus ${moneyMulti(extras.billed)} of extras · ${moneyMulti(extras.outstanding, "all paid")}`
                : undefined
            }
            tone={isSettled ? "good" : "default"}
          />
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-base">Milestones</h2>
            <MilestoneList milestones={milestones ?? []} projectId={project.id} />
          </section>

          {/* Milestones are what the client sees; tasks are how the work
              actually gets divided up. Staff see this too — they need their
              own work — but only owner/admin can hand it out. */}
          <TasksCard
            projectId={project.id}
            tasks={tasks ?? []}
            employees={teamList ?? []}
            canManage={canManage}
            myEmployeeId={me.employeeId}
          />

          {/* The work log feed. Entries marked "shared" are what the client
              sees on their portal timeline. */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-base">Work log</h2>
              <Link href={`${BASE}/daily-logs`} className="mono-tag text-xs hover:text-lime-400">
                add an entry →
              </Link>
            </div>

            {!workLogs?.length ? (
              <div className="card p-8 text-center">
                <p className="text-sm text-bone-300">No work logged on this project yet.</p>
                <p className="mt-1.5 text-xs text-bone-400">
                  Entries submitted in Daily Work Logs appear here, and the ones marked
                  &ldquo;shared&rdquo; show on the client&rsquo;s portal timeline.
                </p>
              </div>
            ) : (
              <ol className="card divide-y divide-ink-600">
                {workLogs.map((l) => (
                  <li key={l.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="mono-tag text-[11px] text-lime-400">
                        {new Date(l.work_date).toLocaleDateString("en-GB", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </span>
                      {l.employee_name && (
                        <span className="text-xs text-bone-300">{l.employee_name}</span>
                      )}
                      <span
                        className={`mono-tag rounded-full border px-2 py-0.5 text-[10px] ${
                          l.client_visible
                            ? "border-lime-400/25 bg-lime-400/10 text-lime-400"
                            : "border-ink-500 text-bone-400"
                        }`}
                      >
                        {l.client_visible ? "Shared with client" : "Internal"}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-bone-100">
                      {l.tasks_completed}
                    </p>
                    {/* The per-service numbers, if the staff member filled any in. */}
                    {!!describeMetrics(l.metrics).length && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {describeMetrics(l.metrics).map((m) => (
                          <span key={m.label} className="mono-tag text-[11px]">
                            {m.label}: <strong className="text-bone-100">{m.value}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                    {l.blockers && (
                      <p className="mt-2 rounded border border-amber-400/20 bg-amber-400/5 p-2 text-xs text-amber-300">
                        Blocker: {l.blockers}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* Status, staging links and the client progress email are the
              account owner's calls — staff report through the work log. */}
          {canManage && (
            <HandoverPanel
              project={{
                id: project.id,
                name: project.name,
                handed_over_at: project.handed_over_at ?? null,
                thanked_at: project.thanked_at ?? null,
              }}
              ready={handoverReady}
              reasons={handoverReasons}
              warnings={handoverWarnings}
              clientName={client?.name ?? ""}
              // WhatsApp first, the ordinary phone number second — most clients
              // have one number that is both, and only one of the two columns
              // tends to get filled in.
              clientWhatsapp={client?.whatsapp || client?.phone || null}
            />
          )}

          {canManage && (
            <CredentialsCard
              projectId={project.id}
              count={((project.credentials as any[]) ?? []).length}
            />
          )}

          {canManage && deal && <DealExtrasCard deal={deal} />}

          {/* Cancelling is a settlement, not a status change — the panel works
              out what goes back before anything is written. */}
          {canManage && <CancelProjectPanel project={project} />}

          {/* Domains, licences, hosting bought for this project. Scoped to the
              project here; the client page shows every one across the account. */}
          {canManage && (
            <ExpensesCard
              clientId={project.client_id}
              clientName={client?.name ?? "this client"}
              projectId={project.id}
              defaultCurrency={contractCurrency || client?.preferred_currency || "USD"}
              expenses={expenses ?? []}
            />
          )}

          {canManage && (
            <ChangeRequestsCard
              projectId={project.id}
              defaultCurrency={contractCurrency || client?.preferred_currency || "USD"}
              requests={changeRequests ?? []}
            />
          )}

          {/* Whose move it is. A project that looks stalled is usually waiting
              on the client, and without this the delay reads as the agency's
              fault by default. */}
          {canManage && project.staging_shared_at && !project.handed_over_at && (
            <section className="card border-ink-600 p-5">
              <h2 className="mb-2 flex items-center gap-2 text-base">
                <Clock size={15} className="text-lime-400" /> Review
              </h2>
              <p className="text-sm leading-relaxed text-bone-200">
                Staging shared with {client?.name ?? "the client"}{" "}
                {new Date(project.staging_shared_at).toLocaleDateString("en-GB")} —{" "}
                <strong>
                  {Math.floor(
                    (Date.now() - new Date(project.staging_shared_at).getTime()) / 864e5
                  )}{" "}
                  days ago
                </strong>
                .
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-bone-400">
                {Number(project.feedback_nudge_count ?? 0) === 0
                  ? "Not chased yet. The first reminder goes out three days after sharing."
                  : Number(project.feedback_nudge_count) >= 3
                    ? "Chased three times with no answer — automatic reminders have stopped. Worth a call."
                    : `Chased ${project.feedback_nudge_count} of 3 times. Reminders stop after the third.`}
              </p>
            </section>
          )}

          {canManage && (
            <section>
              <h2 className="mb-3 text-base">Project controls</h2>
              <ProjectControls project={project} clientEmail={client?.email} />
            </section>
          )}

          {canManage && (
            <section>
              <h2 className="mb-3 text-base">Invoices</h2>
              <div className="card divide-y divide-ink-600">
                {invoiceRows.map((i) => (
                  <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <div>
                      <p style={{ fontFamily: "var(--font-mono)" }}>{i.invoice_no}</p>
                      <p className="text-xs text-bone-300">
                        {i.status === "draft"
                          ? `${money(Number(i.total), i.currency)} · not billed yet${i.due_date ? ` · due ${i.due_date}` : ""}`
                          : `${money(Number(i.amount_paid), i.currency)} of ${money(Number(i.total), i.currency)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{i.status}</Badge>
                      {i.status === "draft" ? (
                        <SendInvoiceButton
                          invoice={{
                            id: i.id, invoice_no: i.invoice_no, currency: i.currency,
                            total: Number(i.total), client_name: client?.name,
                          }}
                        />
                      ) : (
                        <DocButton type="invoice" id={i.id} label="PDF" />
                      )}
                    </div>
                  </div>
                ))}
                {!invoiceRows.length && <p className="p-6 text-center text-sm text-bone-300">No invoices on this project.</p>}
              </div>
            </section>
          )}

          {canManage && project.deals && (
            <section>
              <h2 className="mb-3 text-base">Agreement</h2>
              <div className="card flex items-center justify-between p-4 text-sm">
                <div>
                  <p style={{ fontFamily: "var(--font-mono)" }}>{(project.deals as any).deal_no}</p>
                  <p className="text-xs text-bone-300">
                    {money(Number((project.deals as any).total), (project.deals as any).currency)} contract value
                  </p>
                </div>
                <DocButton type="agreement" id={project.deal_id!} label="Agreement PDF" />
              </div>
            </section>
          )}

          {!canManage && (
            <section>
              <h2 className="mb-3 text-base">Client</h2>
              <div className="card p-4 text-sm">
                <Link href={`${BASE}/clients/${project.client_id}`} className="font-medium hover:text-lime-400">
                  {client?.name}
                </Link>
                {client?.company && <p className="mt-0.5 text-xs text-bone-300">{client.company}</p>}
                <Link
                  href={`${BASE}/daily-logs`}
                  className="btn btn-primary mt-4 h-9 w-full justify-center text-sm"
                >
                  Log work on this project
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
