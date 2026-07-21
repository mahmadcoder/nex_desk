import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Stat } from "@/components/admin/ui";
import { money } from "@/lib/utils";
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

  const [{ data: milestones }, { data: invoices }] = await Promise.all([
    db.from("milestones").select("*").eq("project_id", id).order("sort_order"),
    db.from("invoices").select("*").eq("project_id", id).order("issue_date"),
  ]);

  const paid = (invoices ?? []).reduce((s, i) => s + Number(i.amount_paid), 0);
  const billed = (invoices ?? []).reduce((s, i) => s + Number(i.total), 0);
  const client = project.clients as any;

  return (
    <>
      <Link href={`${BASE}/projects`} className="mono-tag hover:text-bone-50">← projects</Link>

      <PageHead
        title={project.name}
        sub={`${client?.name}${client?.company ? ` · ${client.company}` : ""}`}
        action={
          <div className="flex gap-2">
            <DocButton type="progress_report" id={project.id} label="Progress PDF" />
            <DocButton type="handover" id={project.id} label="Handover PDF" primary />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Progress" value={`${project.progress}%`} tone="good" />
        <Stat label="Status" value={String(project.status).replace(/_/g, " ")} />
        <Stat label="Deadline" value={project.deadline ?? "—"} />
        <Stat label="Paid of billed" value={`${money(paid)} / ${money(billed)}`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-3 text-base">Milestones</h2>
          <MilestoneList milestones={milestones ?? []} projectId={project.id} />
        </section>

        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-base">Project controls</h2>
            <ProjectControls project={project} clientEmail={client?.email} clientName={client?.name} />
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
