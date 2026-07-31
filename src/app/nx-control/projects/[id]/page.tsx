import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { PageHead, Badge, Stat } from "@/components/admin/ui";
import { Lock } from "lucide-react";
import { money, moneyMulti, sumByCurrency } from "@/lib/utils";
import DocButton from "@/components/admin/DocButton";
import MilestoneList from "@/components/admin/MilestoneList";
import ProjectControls from "@/components/admin/ProjectControls";
import SendInvoiceButton from "@/components/admin/SendInvoiceButton";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const dynamic = "force-dynamic";

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentStaff();
  if (!me) return null;

  const canManage = me.isPrivileged;
  const db = createAdminClient();

  const { data: project } = await db.from("projects")
    .select("*, clients(*), deals(deal_no, total, currency)").eq("id", id).single();
  if (!project) notFound();

  // Staff may only open projects for clients they are assigned to. 404 rather
  // than 403 so the page does not confirm the project exists.
  if (!canManage) {
    const allowed = await assignedClientIds(me.employeeId);
    if (!allowed.includes(project.client_id)) notFound();
  }

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
  const client = project.clients as any;
  const deal = (project.deals as any) ?? null;

  // Handover transfers ownership, so it stays locked until the balance clears.
  // The same check runs server-side in generateDocument — the disabled button
  // is a courtesy, not the control.
  //
  // It has to measure against the CONTRACT, not against the invoices raised so
  // far. A 1500 deal billed 50/50 has only a 750 invoice on day one, so an
  // invoice-vs-invoice check called the project settled after the advance.
  const contractValue = deal ? Number(deal.total) : 0;
  const contractCurrency: string | null = deal?.currency ?? null;

  const paidInContractCurrency = contractCurrency
    ? (paid.find((p) => p.currency === contractCurrency.toUpperCase())?.total ?? 0)
    : 0;

  const outstanding = deal
    ? // What is still owed on the agreement, whether or not it has been invoiced.
      [{ currency: contractCurrency!, total: contractValue - paidInContractCurrency }]
        .filter((t) => t.total > 0.009)
    : // No deal on this project — the invoices are all we have to go on.
      sumByCurrency(
        invoiceRows,
        (i) => i.currency,
        (i) => Number(i.total) - Number(i.amount_paid)
      ).filter((t) => t.total > 0.009);

  const isSettled = deal
    ? contractValue > 0 && outstanding.length === 0
    : invoiceRows.length > 0 && outstanding.length === 0;

  return (
    <>
      <Link href={`${BASE}/projects`} className="mono-tag hover:text-bone-50">← projects</Link>

      <PageHead
        title={project.name}
        sub={`${client?.name}${client?.company ? ` · ${client.company}` : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DocButton type="progress_report" id={project.id} label="Progress PDF" />
            {/* Handover transfers ownership and carries credentials — owner/admin only. */}
            {canManage &&
              (isSettled ? (
                <DocButton type="handover" id={project.id} label="Handover PDF" primary />
              ) : (
                <span
                  className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-full border border-ink-500 px-3 text-xs text-bone-300"
                  title={
                    deal
                      ? `Outstanding against the ${money(contractValue, contractCurrency!)} contract: ${moneyMulti(outstanding)}. Handover unlocks once the agreement is paid in full.`
                      : invoiceRows.length
                        ? `Outstanding balance: ${moneyMulti(outstanding)}. Handover unlocks once the project is paid in full.`
                        : "Lock a deal, or raise and settle an invoice, before handing the project over."
                  }
                >
                  <Lock size={12} /> Handover PDF
                </span>
              ))}
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
                : `${moneyMulti(paid, "—")} / ${moneyMulti(
                    sumByCurrency(invoiceRows, (i) => i.currency, (i) => Number(i.total)),
                    "—"
                  )}`
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
          {/* Status, staging links and the client progress email are the
              account owner's calls — staff report through the work log. */}
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
                  className="btn btn-primary mt-4 h-9 w-full justify-center text-xs"
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
