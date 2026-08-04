import Link from "next/link";
import { Layers, Lock, Plus, FileText } from "lucide-react";
import { money, adminPath } from "@/lib/utils";
import { Badge } from "./ui";
import DocButton from "@/components/admin/DocButton";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Everything a client has bought, numbered and expandable.
 *
 * Each service is its own locked deal and its own project, so they each keep a
 * separate progress bar, team, milestone set and invoice schedule. The client
 * profile used to flatten all of that into one "deal locked" button and a bag
 * of service tags, which stopped making sense the moment anyone bought a
 * second thing.
 *
 * Server component: uses <details> for the expansion so there is no client
 * bundle and it works with JavaScript off.
 */
export default function ClientServices({
  clientId,
  services,
  canManage,
}: {
  clientId: string;
  services: Array<{
    deal: any;
    project: any | null;
    /** Contract payment stages only. */
    invoices: any[];
    /** Retainer renewals on the same deal — priced per period, not per contract. */
    renewals?: any[];
  }>;
  canManage: boolean;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-bone-50">
          <Layers size={16} className="text-lime-400" />
          Services ({services.length})
        </h2>
        {canManage && (
          <Link
            href={`${adminPath("/deals/new")}?client=${clientId}`}
            className="btn btn-primary h-9 px-4 text-sm"
          >
            <Plus size={14} /> Add another service
          </Link>
        )}
      </div>

      {services.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-bone-300">Nothing booked yet.</p>
          {canManage && (
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-bone-300">
              Lock a deal to create the agreement, the project, its milestones and the whole
              payment schedule in one step.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {services.map(({ deal, project, invoices, renewals = [] }, i) => {
            // `invoices` is contract payment stages only. A retainer's monthly
            // renewals carry the same deal_id, and counting them here summed
            // month after month against a single period's price — so every
            // retainer read "settled" from month two onwards.
            const issued = invoices.filter((v) => v.status !== "draft");
            const paid = issued.reduce((s, v) => s + Number(v.amount_paid || 0), 0);
            const total = Number(deal.total || 0);
            const settled = total > 0 && paid >= total - 0.01;

            const issuedRenewals = renewals.filter((v: any) => v.status !== "draft");
            const renewalPaid = issuedRenewals.reduce(
              (s: number, v: any) => s + Number(v.amount_paid || 0), 0
            );

            return (
              <details key={deal.id} className="card group border-ink-600" open={i === 0}>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 p-4 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="mono-tag flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lime-400/30 bg-lime-400/10 text-xs font-semibold text-lime-400">
                    {i + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-bone-50">
                      {deal.title}
                    </span>
                    <span className="mono-tag mt-0.5 block text-[11px]">
                      {deal.deal_no}
                      {project ? ` · ${project.progress}% complete` : " · no project"}
                    </span>
                    {/* The client typed their name in the portal to accept
                        this. It was recorded correctly and never displayed —
                        the page simply never asked for the columns. */}
                    {deal.accepted_at && (
                      <span className="mt-1 block text-[11px] text-emerald-300">
                        Accepted by {deal.accepted_name} on{" "}
                        {new Date(deal.accepted_at).toLocaleDateString("en-GB", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </span>
                    )}
                  </span>

                  {canManage && (
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-sm text-bone-50">
                        {money(total, deal.currency)}
                      </span>
                      <span
                        className={`mono-tag text-[11px] ${settled ? "text-emerald-300" : "text-amber-300"}`}
                      >
                        {settled ? "settled" : `${money(paid, deal.currency)} paid`}
                      </span>
                    </span>
                  )}

                  <Badge>{project?.status ?? deal.status}</Badge>
                  <span className="mono-tag shrink-0 text-bone-300 group-open:hidden">+</span>
                  <span className="mono-tag hidden shrink-0 text-bone-300 group-open:inline">−</span>
                </summary>

                <div className="space-y-4 border-t border-ink-700 p-4">
                  {project && (
                    <>
                      <div className="h-2 overflow-hidden rounded-full bg-ink-700">
                        <div
                          className="h-2 rounded-full bg-lime-400 transition-[width] duration-700"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>

                      <div className="grid gap-3 text-xs sm:grid-cols-3">
                        <div>
                          <p className="mono-tag text-[11px]">Started</p>
                          <p className="mt-0.5 text-bone-100">{project.start_date ?? "—"}</p>
                        </div>
                        <div>
                          <p className="mono-tag text-[11px]">Deadline</p>
                          <p className="mt-0.5 text-bone-100">{project.deadline ?? "—"}</p>
                        </div>
                        <div>
                          <p className="mono-tag text-[11px]">Handover</p>
                          <p className="mt-0.5 text-bone-100">
                            {project.handed_over_at
                              ? new Date(project.handed_over_at).toLocaleDateString("en-GB")
                              : "Not yet"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {canManage && !!invoices.length && (
                    <div>
                      <p className="mono-tag mb-2 text-[11px]">Invoices</p>
                      <ul className="divide-y divide-ink-700 rounded-lg border border-ink-700">
                        {invoices.map((v) => (
                          <li
                            key={v.id}
                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                          >
                            <span className="font-mono text-bone-200">{v.invoice_no}</span>
                            <span className="text-bone-300">
                              {v.status === "draft"
                                ? `${money(Number(v.total), v.currency)} · not billed yet`
                                : `${money(Number(v.amount_paid), v.currency)} of ${money(Number(v.total), v.currency)}`}
                            </span>
                            <Badge>{v.status}</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Renewals are their own list. They belong to this deal but
                      are priced per period, so they must not be read as
                      progress towards the contract total above. */}
                  {!!issuedRenewals.length && (
                    <div>
                      <p className="mono-tag mb-2 text-[11px]">
                        Recurring renewals · {money(renewalPaid, deal.currency)} collected
                      </p>
                      <ul className="divide-y divide-ink-700 rounded-lg border border-ink-700">
                        {issuedRenewals.map((v: any) => (
                          <li
                            key={v.id}
                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                          >
                            <span className="font-mono text-bone-200">{v.invoice_no}</span>
                            <span className="text-bone-300">
                              {money(Number(v.amount_paid), v.currency)} of{" "}
                              {money(Number(v.total), v.currency)}
                              <span className="ml-1.5 text-bone-400">· {v.issue_date}</span>
                            </span>
                            <Badge>{v.status}</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 border-t border-ink-700 pt-3">
                    {project && (
                      <Link
                        href={adminPath(`/projects/${project.id}`)}
                        className="btn h-9 px-4 text-sm"
                      >
                        <FileText size={14} /> Open project
                      </Link>
                    )}
                    {canManage && (
                      <DocButton type="agreement" id={deal.id} label="Agreement PDF" />
                    )}
                    {!project && (
                      <span className="mono-tag inline-flex h-9 items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 text-[11px] text-amber-300">
                        <Lock size={11} /> No project — was this deal locked?
                      </span>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
