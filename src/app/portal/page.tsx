import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { money } from "@/lib/utils";
import { Badge, Stat } from "@/components/admin/ui";
import { ExternalLink, CheckCircle, Circle, DollarSign, Calendar, FileText, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Portal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("*").eq("email", user.email!).maybeSingle();

  if (!client) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center mt-12">
        <h1 className="text-2xl font-semibold">No project profile found</h1>
        <p className="mt-3 text-sm text-bone-400">
          Your account ({user.email}) is not currently attached to an active client profile. If you believe this is an error, please reach out to your Nex Desk representative.
        </p>
        <Link href="/" className="btn mt-6 inline-flex">Return to Homepage</Link>
      </div>
    );
  }

  const perms = {
    show_financials: true,
    show_invoices: true,
    show_milestones: true,
    show_files: true,
    show_staging: true,
    ...(client.client_permissions as Record<string, boolean> || {}),
  };

  const [{ data: projects }, { data: invoices }, { data: docs }] = await Promise.all([
    db.from("projects").select("*").eq("client_id", client.id).order("created_at", { ascending: false }),
    db.from("invoices").select("*").eq("client_id", client.id).order("issue_date", { ascending: false }),
    db.from("documents").select("*").eq("client_id", client.id).order("created_at", { ascending: false }),
  ]);

  const withUrls = await Promise.all(
    (docs ?? []).map(async (d) => {
      try {
        const { data } = await db.storage.from("documents").createSignedUrl(d.storage_path, 3600);
        return { ...d, url: data?.signedUrl };
      } catch {
        return { ...d, url: null };
      }
    })
  );

  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: milestones } = projectIds.length
    ? await db.from("milestones").select("*").in("project_id", projectIds).order("sort_order")
    : { data: [] };

  const currency = client.preferred_currency || (invoices?.[0]?.currency ?? "PKR");
  const totalContract = (invoices ?? []).reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = (invoices ?? []).reduce((s, i) => s + Number(i.amount_paid), 0);
  const balanceOwed = totalContract - totalPaid;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-ink-600 pb-6">
        <div>
          <p className="mono-tag text-lime-400">Nex Desk Client Portal</p>
          <h1 className="mt-1 text-3xl font-semibold text-bone-50">Welcome, {client.name}.</h1>
          <p className="mt-1 text-sm text-bone-400">
            {client.company ? `${client.company} · ` : ""}Tracking live progress, payment summaries, and documents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="mono-tag bg-ink-800 px-3 py-1.5 rounded border border-ink-600 text-bone-200">
            Currency: <strong className="text-lime-400">{currency}</strong>
          </span>
        </div>
      </div>

      {/* Financial Summary Cards */}
      {perms.show_financials && (
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <span className="text-xs text-bone-400 block mono-tag mb-1">Total Contract Billed</span>
            <p className="text-2xl font-mono text-bone-50">{money(totalContract, currency)}</p>
          </div>
          <div className="card p-5 border-lime-500/30">
            <span className="text-xs text-lime-400 block mono-tag mb-1">Total Amount Paid</span>
            <p className="text-2xl font-mono text-lime-400">{money(totalPaid, currency)}</p>
          </div>
          <div className="card p-5">
            <span className="text-xs text-bone-400 block mono-tag mb-1">Balance Remaining</span>
            <p className={`text-2xl font-mono ${balanceOwed > 0 ? "text-amber-400" : "text-bone-200"}`}>
              {money(balanceOwed, currency)}
            </p>
          </div>
        </section>
      )}

      {/* Projects & Milestones Section */}
      {(projects ?? []).map((p) => {
        const ms = (milestones ?? []).filter((m) => m.project_id === p.id);
        return (
          <section key={p.id} className="card mt-8 p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-600 pb-5">
              <div>
                <span className="mono-tag text-xs text-lime-400 mb-1 block">Active Project</span>
                <h2 className="text-2xl font-semibold text-bone-50">{p.name}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-bone-400">
                  {p.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Started: {new Date(p.start_date).toLocaleDateString("en-GB")}
                    </span>
                  )}
                  {p.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-lime-400" /> Target Delivery: {new Date(p.deadline).toLocaleDateString("en-GB")}
                    </span>
                  )}
                </div>
              </div>
              <Badge>{p.status}</Badge>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="mono-tag text-xs">Project Progress</span>
                <span className="font-mono text-lime-400">{p.progress}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink-700">
                <div
                  className="h-2.5 rounded-full bg-lime-400 transition-[width] duration-700"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
            </div>

            {/* Milestones */}
            {perms.show_milestones && !!ms.length && (
              <div className="mt-8">
                <h3 className="mono-tag text-xs text-bone-400 mb-3">Project Milestones</h3>
                <ul className="divide-y divide-ink-600 rounded-lg border border-ink-600 bg-ink-900/40">
                  {ms.map((m) => (
                    <li key={m.id} className="flex items-center justify-between p-3.5 text-sm">
                      <div className="flex items-center gap-3">
                        {m.is_done ? (
                          <CheckCircle className="h-4 w-4 text-lime-400 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-bone-500 shrink-0" />
                        )}
                        <span className={m.is_done ? "text-bone-400 line-through" : "text-bone-100"}>
                          {m.title}
                        </span>
                      </div>
                      {m.due_date && (
                        <span className="mono-tag text-xs text-bone-400">{m.due_date}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Staging / Preview Action */}
            {perms.show_staging && p.staging_url && (
              <div className="mt-6 flex justify-end">
                <a
                  href={p.staging_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary h-10 px-5 text-sm gap-2"
                >
                  Open Live Staging Preview <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </section>
        );
      })}

      {/* Invoices & Documents Section */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {perms.show_invoices && (
          <section className="card p-6">
            <div className="flex items-center justify-between border-b border-ink-600 pb-4">
              <h2 className="text-lg font-medium text-bone-50 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-lime-400" /> Invoices & Receipts
              </h2>
              {balanceOwed > 0 && (
                <span className="mono-tag text-amber-400 text-xs">{money(balanceOwed, currency)} due</span>
              )}
            </div>

            <ul className="mt-4 divide-y divide-ink-600">
              {(invoices ?? []).map((i) => (
                <li key={i.id} className="flex items-center justify-between py-3.5 text-sm">
                  <div>
                    <p className="font-mono text-bone-100">{i.invoice_no}</p>
                    <p className="text-xs text-bone-400">
                      Paid: {money(Number(i.amount_paid), i.currency)} / Total: {money(Number(i.total), i.currency)}
                    </p>
                  </div>
                  <Badge>{i.status}</Badge>
                </li>
              ))}
              {!invoices?.length && (
                <li className="py-6 text-center text-sm text-bone-400">No invoices recorded yet.</li>
              )}
            </ul>
          </section>
        )}

        {perms.show_files && (
          <section className="card p-6">
            <div className="border-b border-ink-600 pb-4">
              <h2 className="text-lg font-medium text-bone-50 flex items-center gap-2">
                <FileText className="h-4 w-4 text-lime-400" /> Shared Documents & PDF Assets
              </h2>
            </div>

            <ul className="mt-4 divide-y divide-ink-600">
              {withUrls.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 py-3.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-bone-100">{d.title}</p>
                    <p className="mono-tag text-xs text-bone-400">{new Date(d.created_at).toLocaleDateString("en-GB")}</p>
                  </div>
                  {d.url && (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mono-tag flex items-center gap-1 text-lime-400 hover:underline shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" /> Download PDF
                    </a>
                  )}
                </li>
              ))}
              {!withUrls.length && (
                <li className="py-6 text-center text-sm text-bone-400">No documents uploaded yet.</li>
              )}
            </ul>
          </section>
        )}
      </div>

      <div className="mt-12 text-center text-xs text-bone-500 space-y-2">
        <p>
          Need assistance or wish to request revisions? Contact your Nex Desk project manager at{" "}
          <a href="mailto:hello@nexdesk.com" className="text-lime-400 underline">hello@nexdesk.com</a>
        </p>
      </div>
    </div>
  );
}
