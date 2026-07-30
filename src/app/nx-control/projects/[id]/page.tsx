import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Stat } from "@/components/admin/ui";
import { Lock } from "lucide-react";
import { money, moneyMulti, sumByCurrency } from "@/lib/utils";
import DocButton from "@/components/admin/DocButton";
import MilestoneList from "@/components/admin/MilestoneList";
import ProjectControls from "@/components/admin/ProjectControls";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const dynamic = "force-dynamic";

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const { data: project } = await db.from("projects")
    .select("*, clients(*), deals(deal_no, total, currency)").eq("id", id).single();
  if (!project) notFound();

  const [{ data: milestones }, { data: invoices }, { data: workLogs }] = await Promise.all([
    db.from("milestones").select("*").eq("project_id", id).order("sort_order"),
    db.from("invoices").select("*").eq("project_id", id).order("issue_date"),
    db.from("daily_work_logs")
      .select("id, work_date, tasks_completed, blockers, employee_name, client_visible")
      .eq("project_id", id)
      .order("work_date", { ascending: false })
      .limit(20),
  ]);

  const invoiceRows = invoices ?? [];
  const paid = sumByCurrency(invoiceRows, (i) => i.currency, (i) => Number(i.amount_paid));
  const billed = sumByCurrency(invoiceRows, (i) => i.currency, (i) => Number(i.total));
  const client = project.clients as any;

  // Handover transfers ownership, so it stays locked until the balance clears.
  // The same check runs server-side in generateDocument — the disabled button
  // is a courtesy, not the control.
  const outstanding = sumByCurrency(
    invoiceRows,
    (i) => i.currency,
    (i) => Number(i.total) - Number(i.amount_paid)
  ).filter((t) => t.total > 0.009);
  const isSettled = invoiceRows.length > 0 && outstanding.length === 0;

  return (
    <>
      <Link href={`${BASE}/projects`} className="mono-tag hover:text-bone-50">← projects</Link>

      <PageHead
        title={project.name}
        sub={`${client?.name}${client?.company ? ` · ${client.company}` : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DocButton type="progress_report" id={project.id} label="Progress PDF" />
            {isSettled ? (
              <DocButton type="handover" id={project.id} label="Handover PDF" primary />
            ) : (
              <span
                className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-full border border-ink-500 px-3 text-xs text-bone-500"
                title={
                  invoiceRows.length
                    ? `Outstanding balance: ${moneyMulti(outstanding)}. Handover unlocks once the project is paid in full.`
                    : "Raise and settle an invoice before handing the project over."
                }
              >
                <Lock size={12} /> Handover PDF
              </span>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Progress" value={`${project.progress}%`} tone="good" />
        <Stat label="Status" value={String(project.status).replace(/_/g, " ")} />
        <Stat label="Deadline" value={project.deadline ?? "—"} />
        <Stat
          label="Paid of billed"
          value={`${moneyMulti(paid, "—")} / ${moneyMulti(billed, "—")}`}
          tone={isSettled ? "good" : "default"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-base">Milestones</h2>
            <MilestoneList milestones={milestones ?? []} projectId={project.id} />
          </section>

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
          <section>
            <h2 className="mb-3 text-base">Project controls</h2>
            <ProjectControls project={project} clientEmail={client?.email} />
          </section>

          <section>
            <h2 className="mb-3 text-base">Invoices</h2>
            <div className="card divide-y divide-ink-600">
              {(invoices ?? []).map((i) => (
                <div key={i.id} className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <p style={{ fontFamily: "var(--font-mono)" }}>{i.invoice_no}</p>
                    <p className="text-xs text-bone-400">
                      {money(Number(i.amount_paid), i.currency)} of {money(Number(i.total), i.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{i.status}</Badge>
                    <DocButton type="invoice" id={i.id} label="PDF" />
                  </div>
                </div>
              ))}
              {!invoices?.length && <p className="p-6 text-center text-sm text-bone-400">No invoices on this project.</p>}
            </div>
          </section>

          {project.deals && (
            <section>
              <h2 className="mb-3 text-base">Agreement</h2>
              <div className="card flex items-center justify-between p-4 text-sm">
                <div>
                  <p style={{ fontFamily: "var(--font-mono)" }}>{(project.deals as any).deal_no}</p>
                  <p className="text-xs text-bone-400">
                    {money(Number((project.deals as any).total), (project.deals as any).currency)} contract value
                  </p>
                </div>
                <DocButton type="agreement" id={project.deal_id!} label="Agreement PDF" />
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
