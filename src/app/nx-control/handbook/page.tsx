import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead } from "@/components/admin/ui";
import { listInternalDocs } from "@/lib/actions/internalDocs";
import { DOC_CATEGORIES, categoryLabel } from "@/config/docCategories";
import HandbookClient, { DeleteDocButton } from "@/components/admin/HandbookClient";
import { fmtDate } from "@/lib/datetime";
import { FileText, ExternalLink, Download } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Handbook" };
export const dynamic = "force-dynamic";

function size(bytes?: number | null) {
  if (!bytes) return null;
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * How we do things here.
 *
 * Every employee reads; owner/admin write. There has never been anywhere for a
 * staff-only file to live — `documents` is client-scoped and `project_files` is
 * project-scoped — so the SOP lived in somebody's head and the brand guidelines
 * in a WhatsApp thread.
 */
export default async function HandbookPage() {
  const me = await getCurrentStaff();
  if (!me) return null;

  const docs = await listInternalDocs();
  const canManage = me.isPrivileged;

  return (
    <>
      <PageHead
        title="Handbook"
        sub="How we work: procedures, brand, policies and shared resources. Internal only — none of this is ever visible to a client."
        action={canManage ? <HandbookClient /> : undefined}
      />

      {!docs.length ? (
        <p className="card p-10 text-center text-sm text-bone-400">
          {canManage
            ? "Nothing here yet. Start with the one thing you explain to every new person."
            : "Nothing has been added yet."}
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {DOC_CATEGORIES.map(([key]) => {
            const items = docs.filter((d: any) => d.category === key);
            // Empty categories are dropped — five "nothing here" headings
            // between somebody and the one file they want is its own problem.
            if (!items.length) return null;

            return (
              <section key={key}>
                <h2 className="mono-tag mb-3">
                  {categoryLabel(key)} <span className="text-bone-500">({items.length})</span>
                </h2>

                <ul className="card divide-y divide-ink-600">
                  {items.map((d: any) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-start justify-between gap-3 p-4"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <FileText size={15} className="mt-0.5 shrink-0 text-lime-400" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-bone-100">{d.title}</p>
                          {d.description && (
                            <p className="mt-0.5 text-xs leading-relaxed text-bone-300">
                              {d.description}
                            </p>
                          )}
                          <p className="mono-tag mt-1 text-[10px]">
                            {fmtDate(d.created_at)}
                            {size(d.file_size) ? ` · ${size(d.file_size)}` : ""}
                            {d.link_url ? " · external link" : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {d.url && (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mono-tag inline-flex items-center gap-1 text-[11px] text-lime-400 hover:underline"
                          >
                            {d.link_url ? (
                              <>
                                <ExternalLink size={12} /> Open
                              </>
                            ) : (
                              <>
                                <Download size={12} /> Download
                              </>
                            )}
                          </a>
                        )}
                        {canManage && <DeleteDocButton id={d.id} title={d.title} />}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
