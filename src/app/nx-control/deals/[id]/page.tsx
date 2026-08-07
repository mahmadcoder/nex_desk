import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Badge } from "@/components/admin/ui";
import { money } from "@/lib/utils";
import DealForm from "@/components/admin/DealForm";
import QuoteActions from "@/components/admin/QuoteActions";
import DocButton from "@/components/admin/DocButton";
import ServiceTags from "@/components/admin/ServiceTags";
import { ArrowLeft } from "lucide-react";
import { fmtDate } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();
  const { data: deal } = await db.from("deals").select("deal_no, title").eq("id", id).maybeSingle();
  return { title: deal ? `${deal.deal_no} — ${deal.title}` : "Deal" };
}

/**
 * One deal, and what to do with it.
 *
 * This page did not exist. A deal could be created and locked, and that was
 * the whole life cycle — so a quote that came back with "can you do it for
 * less?" had nowhere to go. Editing lives here, alongside the win/lose/chase
 * decision.
 */
export default async function DealDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentStaff();
  // Deals are commercial. Staff have no business on this page, and the
  // /deals segment is already blocked for them at the layout level.
  if (!me?.isPrivileged) return null;

  const db = createAdminClient();

  const { data: deal, error } = await db
    .from("deals").select("*, clients(id, name, email, company)").eq("id", id).maybeSingle();

  if (error) console.error("Failed to load deal", id, error);
  if (!deal) notFound();

  const [{ data: clients }, { data: services }, { data: settings }, { data: project }] =
    await Promise.all([
      db.from("clients").select("id,name,email,company,preferred_currency").eq("is_active", true).order("name"),
      db.from("services").select("slug,title,category,starting_at").eq("is_active", true).order("sort_order"),
      db.from("settings").select("default_terms, tax_percent, default_currency").eq("id", 1).single(),
      db.from("projects").select("id, name").eq("deal_id", id).maybeSingle(),
    ]);

  const client = deal.clients as any;
  const isLost = !!deal.lost_at;
  const locked = deal.status === "locked";

  return (
    <>
      <PageHead
        title={deal.title}
        sub={`${deal.deal_no} · ${client?.name ?? "—"}${client?.company ? ` · ${client.company}` : ""}`}
        action={
          <Link href={`${BASE}/deals`} className="btn h-10 gap-1.5">
            <ArrowLeft size={14} /> Pipeline
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* A locked deal is an agreement with a project, milestones and
              invoices behind it. Editing the figures now would silently
              disagree with the PDF the client already signed. */}
          {locked ? (
            <section className="card p-6">
              <h2 className="mb-4 text-base">Agreement</h2>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-bone-400">Value</dt>
                  <dd className="font-mono">{money(Number(deal.total), deal.currency)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-bone-400">Locked</dt>
                  <dd>{fmtDate(deal.locked_at)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-bone-400">Deadline</dt>
                  <dd>{deal.deadline ?? "—"}</dd>
                </div>
                {deal.accepted_at && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-bone-400">Accepted in portal</dt>
                    <dd>
                      {deal.accepted_name} · {fmtDate(deal.accepted_at)}
                    </dd>
                  </div>
                )}
              </dl>

              {deal.summary && (
                <p className="mt-5 border-t border-ink-700 pt-4 text-sm leading-relaxed text-bone-300">
                  {deal.summary}
                </p>
              )}

              {/* Services ARE editable on a locked deal: they are a label, not
                  a figure on the signed PDF, and they decide which questions
                  staff get in Daily Work Logs. */}
              <div className="mt-5 border-t border-ink-700 pt-4">
                <ServiceTags
                  dealId={deal.id}
                  slugs={(deal.service_slugs as string[]) ?? []}
                  catalogue={services ?? []}
                  canManage
                />
              </div>

              <p className="mt-5 text-xs leading-relaxed text-bone-400">
                A locked agreement is not editable here — the client has a signed PDF with these
                figures on it. Price changes after this point go through a change request on the
                project. Services above are only a label and can be corrected any time.
              </p>
            </section>
          ) : (
            <>
              <div className="rounded-lg border border-ink-600 bg-ink-800/50 p-3.5">
                <p className="text-xs leading-relaxed text-bone-300">
                  {isLost
                    ? "This one was lost. Adjust anything below and send it again to reopen it — re-quoting clears the loss."
                    : "Change anything, then either send the revised quote or lock it in. Nothing reaches the client until you press one of those."}
                </p>
              </div>

              <DealForm
                clients={clients ?? []}
                services={services ?? []}
                defaultTerms={settings?.default_terms ?? ""}
                taxDefault={Number(settings?.tax_percent ?? 0)}
                defaultCurrency={settings?.default_currency ?? "PKR"}
                initialDeal={deal}
                templates={[]}
              />
            </>
          )}
        </div>

        <aside className="space-y-4">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-ink-700 pb-3">
              <h2 className="text-base">Status</h2>
              <Badge>{isLost ? "lost" : deal.status}</Badge>
            </div>
            <QuoteActions deal={deal} />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 border-b border-ink-700 pb-3 text-base">Documents</h2>
            <div className="space-y-2">
              <DocButton type="quotation" id={deal.id} label="Quotation PDF" />
              {locked && <DocButton type="agreement" id={deal.id} label="Agreement PDF" />}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-bone-400">
              Generating a PDF here saves a copy to the client&rsquo;s documents.
            </p>
          </section>

          {project && (
            <section className="card p-5">
              <h2 className="mb-3 border-b border-ink-700 pb-3 text-base">Project</h2>
              <Link
                href={`${BASE}/projects/${project.id}`}
                className="text-sm text-bone-100 hover:text-lime-400"
              >
                {project.name} →
              </Link>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
