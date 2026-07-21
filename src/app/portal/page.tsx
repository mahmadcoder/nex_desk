import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { money } from "@/lib/utils";
import { Badge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function Portal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("*").eq("email", user.email!).maybeSingle();

  if (!client) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <h1 className="text-2xl">No projects on this account</h1>
        <p className="mt-3 text-sm text-bone-400">
          This email isn&apos;t linked to a project yet. If that seems wrong, email ahmadsadiq.dev@gmail.com.
        </p>
      </div>
    );
  }

  const [{ data: projects }, { data: invoices }, { data: docs }] = await Promise.all([
    db.from("projects").select("*").eq("client_id", client.id).order("created_at", { ascending: false }),
    db.from("invoices").select("*").eq("client_id", client.id).order("issue_date", { ascending: false }),
    db.from("documents").select("*").eq("client_id", client.id).order("created_at", { ascending: false }),
  ]);

  const withUrls = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data } = await db.storage.from("documents").createSignedUrl(d.storage_path, 3600);
      return { ...d, url: data?.signedUrl };
    })
  );

  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: milestones } = projectIds.length
    ? await db.from("milestones").select("*").in("project_id", projectIds).order("sort_order")
    : { data: [] };

  const owed = (invoices ?? []).reduce((s, i) => s + Number(i.total) - Number(i.amount_paid), 0);

  return (
    <>
      <p className="drawer-label">Portal</p>
      <h1 className="mt-6 text-[var(--text-h2)]">Hello, {client.name.split(" ")[0]}.</h1>
      <p className="mt-3 text-bone-400">
        Everything on your projects lives here — progress, documents and invoices.
      </p>

      {(projects ?? []).map((p) => {
        const ms = (milestones ?? []).filter((m) => m.project_id === p.id);
        return (
          <section key={p.id} className="card mt-10 p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl">{p.name}</h2>
                <p className="mt-1 text-sm text-bone-400">
                  {p.deadline ? `Due ${new Date(p.deadline).toLocaleDateString("en-GB", { dateStyle: "long" })}` : "No deadline set"}
                </p>
              </div>
              <Badge>{p.status}</Badge>
            </div>

            <div className="mt-7">
              <div className="mb-2 flex justify-between text-sm">
                <span className="mono-tag">Progress</span>
                <span>{p.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-ink-600">
                <div className="h-2 rounded bg-lime-400 transition-[width] duration-700" style={{ width: `${p.progress}%` }} />
              </div>
            </div>

            {!!ms.length && (
              <ul className="mt-8 divide-y divide-ink-600 border-y border-ink-600">
                {ms.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-3.5 text-sm">
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] ${
                      m.is_done ? "bg-lime-400 text-lime-950" : "border border-ink-500"
                    }`}>
                      {m.is_done ? "✓" : ""}
                    </span>
                    <span className={m.is_done ? "text-bone-400 line-through" : ""}>{m.title}</span>
                    <span className="mono-tag ml-auto">{m.due_date ?? ""}</span>
                  </li>
                ))}
              </ul>
            )}

            {p.staging_url && (
              <a href={p.staging_url} target="_blank" rel="noreferrer" className="btn btn-primary mt-7">
                Open the preview link
              </a>
            )}
          </section>
        );
      })}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="card p-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl">Invoices</h2>
            {owed > 0 && <span className="mono-tag text-[#FBBF24]">{money(owed, client.preferred_currency)} outstanding</span>}
          </div>
          <ul className="mt-5 divide-y divide-ink-600">
            {(invoices ?? []).map((i) => (
              <li key={i.id} className="flex items-center justify-between py-3.5 text-sm">
                <div>
                  <p style={{ fontFamily: "var(--font-mono)" }}>{i.invoice_no}</p>
                  <p className="text-xs text-bone-400">
                    {money(Number(i.amount_paid), i.currency)} of {money(Number(i.total), i.currency)} paid
                  </p>
                </div>
                <Badge>{i.status}</Badge>
              </li>
            ))}
            {!invoices?.length && <li className="py-6 text-center text-sm text-bone-400">No invoices yet.</li>}
          </ul>
        </section>

        <section className="card p-8">
          <h2 className="text-xl">Your documents</h2>
          <p className="mt-1 text-sm text-bone-400">Agreements, invoices and receipts. Download anytime.</p>
          <ul className="mt-5 divide-y divide-ink-600">
            {withUrls.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 py-3.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{d.title}</p>
                  <p className="mono-tag">{new Date(d.created_at).toLocaleDateString("en-GB")}</p>
                </div>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noreferrer" className="mono-tag shrink-0 hover:text-lime-400">
                    download →
                  </a>
                )}
              </li>
            ))}
            {!withUrls.length && <li className="py-6 text-center text-sm text-bone-400">Nothing here yet.</li>}
          </ul>
        </section>
      </div>

      <p className="mono-tag mt-12 text-center">
        need something? email <a href="mailto:ahmadsadiq.dev@gmail.com" className="hover:text-bone-50">ahmadsadiq.dev@gmail.com</a>
      </p>
      <div className="mt-4 text-center">
        <Link href="/" className="mono-tag hover:text-bone-50">← back to nexdesk.agency</Link>
      </div>
    </>
  );
}
