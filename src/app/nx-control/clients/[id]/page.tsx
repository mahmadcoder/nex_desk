import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Stat, Table } from "@/components/admin/ui";
import { money } from "@/lib/utils";
import DocButton from "@/components/admin/DocButton";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const dynamic = "force-dynamic";

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const { data: client } = await db.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  const [{ data: projects }, { data: invoices }, { data: docs }, { data: emails }] = await Promise.all([
    db.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    db.from("invoices").select("*").eq("client_id", id).order("issue_date", { ascending: false }),
    db.from("documents").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    db.from("email_log").select("subject, status, sent_at").eq("client_id", id).order("sent_at", { ascending: false }).limit(8),
  ]);

  const billed = (invoices ?? []).reduce((s, i) => s + Number(i.total), 0);
  const paid = (invoices ?? []).reduce((s, i) => s + Number(i.amount_paid), 0);

  return (
    <>
      <Link href={`${BASE}/clients`} className="mono-tag hover:text-bone-50">← clients</Link>

      <PageHead
        title={client.name}
        sub={[client.company, client.email, [client.city, client.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
        action={<Link href={`${BASE}/deals/new`} className="btn btn-primary h-10">Lock a deal</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Billed" value={money(billed, client.preferred_currency)} />
        <Stat label="Paid" value={money(paid, client.preferred_currency)} tone="good" />
        <Stat label="Outstanding" value={money(billed - paid, client.preferred_currency)} tone={billed - paid > 0 ? "warn" : "default"} />
        <Stat label="Projects" value={String(projects?.length ?? 0)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base">Projects</h2>
          <Table head={["Project", "Progress", "Status"]}>
            {(projects ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-ink-700/30">
                <td className="px-5 py-3">
                  <Link href={`${BASE}/projects/${p.id}`} className="hover:text-lime-400">{p.name}</Link>
                </td>
                <td className="px-5 py-3">{p.progress}%</td>
                <td className="px-5 py-3"><Badge>{p.status}</Badge></td>
              </tr>
            ))}
            {!projects?.length && <tr><td colSpan={3} className="px-5 py-8 text-center text-bone-400">No projects yet.</td></tr>}
          </Table>
        </section>

        <section>
          <h2 className="mb-3 text-base">Invoices</h2>
          <Table head={["Invoice", "Total", "Status", ""]}>
            {(invoices ?? []).map((i) => (
              <tr key={i.id} className="hover:bg-ink-700/30">
                <td className="px-5 py-3" style={{ fontFamily: "var(--font-mono)" }}>{i.invoice_no}</td>
                <td className="px-5 py-3">{money(Number(i.total), i.currency)}</td>
                <td className="px-5 py-3"><Badge>{i.status}</Badge></td>
                <td className="px-5 py-3 text-right"><DocButton type="invoice" id={i.id} label="PDF" /></td>
              </tr>
            ))}
            {!invoices?.length && <tr><td colSpan={4} className="px-5 py-8 text-center text-bone-400">No invoices yet.</td></tr>}
          </Table>
        </section>

        <section>
          <h2 className="mb-3 text-base">Documents sent</h2>
          <Table head={["Document", "Type", "When"]}>
            {(docs ?? []).map((d) => (
              <tr key={d.id}>
                <td className="px-5 py-3">{d.title}</td>
                <td className="px-5 py-3"><Badge>{d.type}</Badge></td>
                <td className="px-5 py-3 text-bone-400">{new Date(d.created_at).toLocaleDateString("en-GB")}</td>
              </tr>
            ))}
            {!docs?.length && <tr><td colSpan={3} className="px-5 py-8 text-center text-bone-400">Nothing generated yet.</td></tr>}
          </Table>
        </section>

        <section>
          <h2 className="mb-3 text-base">Recent emails</h2>
          <Table head={["Subject", "Status", "When"]}>
            {(emails ?? []).map((e, i) => (
              <tr key={i}>
                <td className="px-5 py-3">{e.subject}</td>
                <td className="px-5 py-3"><Badge>{e.status}</Badge></td>
                <td className="px-5 py-3 text-bone-400">{new Date(e.sent_at).toLocaleDateString("en-GB")}</td>
              </tr>
            ))}
            {!emails?.length && <tr><td colSpan={3} className="px-5 py-8 text-center text-bone-400">No emails sent yet.</td></tr>}
          </Table>
        </section>
      </div>

      {client.notes && (
        <section className="mt-8">
          <h2 className="mb-3 text-base">Notes</h2>
          <div className="card whitespace-pre-line p-5 text-sm text-bone-200">{client.notes}</div>
        </section>
      )}
    </>
  );
}
