import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Stat, Badge, Table } from "@/components/admin/ui";
import { money } from "@/lib/utils";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const db = createAdminClient();
  const monthStart = new Date(new Date().setDate(1)).toISOString().slice(0, 10);

  const [payments, invoices, projects, leads, deals] = await Promise.all([
    db.from("payments").select("amount, currency, paid_on").gte("paid_on", monthStart),
    db.from("invoices").select("id, invoice_no, total, amount_paid, currency, status, due_date, clients(name)")
      .in("status", ["sent", "partial", "overdue"]).order("due_date"),
    db.from("projects").select("id, name, status, progress, deadline, clients(name)")
      .not("status", "in", "(completed,cancelled)").order("deadline"),
    db.from("leads").select("id, name, email, company, status, created_at, service_slugs")
      .order("created_at", { ascending: false }).limit(6),
    db.from("deals").select("total, currency, status").eq("status", "locked"),
  ]);

  const revenue = (payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = (invoices.data ?? []).reduce((s, i) => s + (Number(i.total) - Number(i.amount_paid)), 0);
  const overdue = (invoices.data ?? []).filter((i) => i.status === "overdue").length;
  const newLeads = (leads.data ?? []).filter((l) => l.status === "new").length;
  const booked = (deals.data ?? []).reduce((s, d) => s + Number(d.total), 0);

  return (
    <>
      <PageHead
        title="Dashboard"
        sub={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        action={<Link href={`${BASE}/deals/new`} className="btn btn-primary h-10">Lock a deal</Link>}
      />

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Revenue this month" value={money(revenue)} tone="good" />
        <Stat label="Outstanding" value={money(outstanding)} hint={`${invoices.data?.length ?? 0} unpaid invoices`} tone={outstanding > 0 ? "warn" : "default"} />
        <Stat label="Overdue" value={String(overdue)} tone={overdue ? "warn" : "default"} />
        <Stat label="Active projects" value={String(projects.data?.length ?? 0)} />
        <Stat label="New leads" value={String(newLeads)} hint={`${leads.data?.length ?? 0} total recent`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base">Projects in flight</h2>
            <Link href={`${BASE}/projects`} className="mono-tag hover:text-bone-50">view all</Link>
          </div>
          <Table head={["Project", "Client", "Progress", "Deadline"]}>
            {(projects.data ?? []).slice(0, 6).map((p) => (
              <tr key={p.id} className="hover:bg-ink-700/30">
                <td className="px-5 py-3">
                  <Link href={`${BASE}/projects/${p.id}`} className="hover:text-lime-400">{p.name}</Link>
                </td>
                <td className="px-5 py-3 text-bone-400">{(p.clients as unknown as { name: string })?.name}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-16 overflow-hidden rounded bg-ink-600">
                      <div className="h-1 bg-lime-400" style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="mono-tag">{p.progress}%</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-bone-400">{p.deadline ?? "—"}</td>
              </tr>
            ))}
            {!projects.data?.length && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-bone-400">Nothing active right now.</td></tr>
            )}
          </Table>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base">Money owed</h2>
            <Link href={`${BASE}/invoices`} className="mono-tag hover:text-bone-50">view all</Link>
          </div>
          <Table head={["Invoice", "Client", "Balance", "Status"]}>
            {(invoices.data ?? []).slice(0, 6).map((i) => (
              <tr key={i.id} className="hover:bg-ink-700/30">
                <td className="px-5 py-3" style={{ fontFamily: "var(--font-mono)" }}>{i.invoice_no}</td>
                <td className="px-5 py-3 text-bone-400">{(i.clients as unknown as { name: string })?.name}</td>
                <td className="px-5 py-3">{money(Number(i.total) - Number(i.amount_paid), i.currency)}</td>
                <td className="px-5 py-3"><Badge>{i.status}</Badge></td>
              </tr>
            ))}
            {!invoices.data?.length && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-bone-400">Everything is paid. Nice.</td></tr>
            )}
          </Table>
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base">Latest leads</h2>
          <Link href={`${BASE}/leads`} className="mono-tag hover:text-bone-50">inbox</Link>
        </div>
        <Table head={["Name", "Company", "Wants", "Status", "When"]}>
          {(leads.data ?? []).map((l) => (
            <tr key={l.id} className="hover:bg-ink-700/30">
              <td className="px-5 py-3">
                <Link href={`${BASE}/leads`} className="hover:text-lime-400">{l.name}</Link>
                <p className="text-xs text-bone-400">{l.email}</p>
              </td>
              <td className="px-5 py-3 text-bone-400">{l.company ?? "—"}</td>
              <td className="hidden px-5 py-3 text-bone-400 sm:table-cell">{(l.service_slugs ?? []).join(", ") || "—"}</td>
              <td className="px-5 py-3"><Badge>{l.status}</Badge></td>
              <td className="px-5 py-3 text-bone-400">{new Date(l.created_at).toLocaleDateString("en-GB")}</td>
            </tr>
          ))}
          {!leads.data?.length && (
            <tr><td colSpan={5} className="px-5 py-8 text-center text-bone-400">No leads yet.</td></tr>
          )}
        </Table>
      </section>

      <p className="mono-tag mt-10">
        booked and locked to date: {money(booked)}
      </p>
    </>
  );
}
