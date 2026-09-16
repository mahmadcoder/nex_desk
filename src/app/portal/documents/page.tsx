import { redirect } from "next/navigation";
import { requirePortalPerm } from "@/lib/portal/session";
import { loadDocuments, loadBilling } from "@/lib/portal/data";
import { fmtDate } from "@/lib/datetime";
import { money } from "@/lib/utils";
import ClientDocumentUploader from "@/components/portal/ClientDocumentUploader";
import AcceptAgreement from "@/components/portal/AcceptAgreement";
import { FileText, Download, FileSignature } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents" };

export default async function PortalDocuments() {
  const session = await requirePortalPerm("show_files");
  if (!session) redirect("/portal");

  const { client, isPaused } = session;
  const [docs, billing] = await Promise.all([
    loadDocuments(client.id),
    loadBilling(client.id),
  ]);

  return (
    <>
      <header className="border-b border-ink-600 pb-6">
        <p className="mono-tag text-lime-400">Documents</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-bone-50">
          Everything on paper, in one place.
        </h1>
        <p className="mt-2 text-sm text-bone-300">
          Agreements, invoices, receipts and reports. Yours to download at any time, including
          long after the work is finished.
        </p>
      </header>

      {/* ── Agreements & Service Contracts ── */}
      {!!billing.deals.length && (
        <section className="card mt-8 p-5 sm:p-6 border-lime-400/25 bg-lime-400/[0.02]">
          <div className="border-b border-ink-600 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-medium leading-tight text-bone-50">
                <FileSignature className="h-4 w-4 text-lime-400" /> Agreements &amp; Service Contracts
              </h2>
              <p className="mt-1 text-xs text-bone-400">
                Official statements of work, scopes, and digital agreements for your projects.
              </p>
            </div>
            <span className="mono-tag text-xs text-lime-400">
              {billing.deals.length} Contract{billing.deals.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {billing.deals.map((d: any) => (
              <AcceptAgreement
                key={d.id}
                deal={{
                  id: d.id,
                  deal_no: d.deal_no,
                  title: d.title,
                  amount: money(Number(d.total), d.currency),
                  accepted_at: d.accepted_at ?? null,
                  accepted_name: d.accepted_name ?? null,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* A paused account keeps everything readable but cannot upload. The same
          rule is enforced server-side — hiding a form is not a control. */}
      {!isPaused && (
        <div className="mt-8">
          <ClientDocumentUploader clientId={client.id} />
        </div>
      )}

      <section className="card mt-6 p-5 sm:p-6">
        <div className="border-b border-ink-600 pb-4">
          <h2 className="flex items-center gap-2 text-lg font-medium leading-tight text-bone-50">
            <FileText className="h-4 w-4 text-lime-400" /> Shared documents &amp; PDF assets
          </h2>
        </div>

        <ul className="mt-4 divide-y divide-ink-600">
          {docs.map((d: any) => (
            <li key={d.id} className="flex items-center justify-between gap-4 py-3.5 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-bone-100">{d.title}</p>
                  {d.uploaded_by_client && (
                    <span className="mono-tag shrink-0 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-1 text-[11px] leading-none text-emerald-300">
                      Client signed
                    </span>
                  )}
                </div>
                <p className="mono-tag text-xs text-bone-300">{fmtDate(d.created_at)}</p>
              </div>
              {d.url && (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mono-tag flex shrink-0 items-center gap-1 text-lime-400 hover:underline"
                >
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </a>
              )}
            </li>
          ))}
          {!docs.length && (
            <li className="py-6 text-center text-sm text-bone-300">No documents uploaded yet.</li>
          )}
        </ul>
      </section>
    </>
  );
}
