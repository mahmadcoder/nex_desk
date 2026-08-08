import { redirect } from "next/navigation";
import { requirePortalPerm } from "@/lib/portal/session";
import { loadDocuments } from "@/lib/portal/data";
import { fmtDate } from "@/lib/datetime";
import ClientDocumentUploader from "@/components/portal/ClientDocumentUploader";
import { FileText, Download } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents" };

export default async function PortalDocuments() {
  const session = await requirePortalPerm("show_files");
  if (!session) redirect("/portal");

  const { client, isPaused } = session;
  const docs = await loadDocuments(client.id);

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
