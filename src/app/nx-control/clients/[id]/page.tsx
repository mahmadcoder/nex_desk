import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Stat, Table } from "@/components/admin/ui";
import { money } from "@/lib/utils";
import DocButton from "@/components/admin/DocButton";
import ClientManagerCard from "@/components/admin/ClientManagerCard";
import { Calendar, Layers, Clock, CheckCircle2, ShieldCheck, Mail, Globe } from "lucide-react";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("name, company").eq("id", id).single();
  if (!client) return { title: "Client Profile" };
  return {
    title: `${client.name}${client.company ? ` (${client.company})` : ""} — Client Profile`,
  };
}

function getClientTenure(createdAt: string) {
  const start = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? "day" : "days"}`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"}`;
  const years = (months / 12).toFixed(1);
  return `${years} years`;
}

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const { data: client } = await db.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  const [{ data: projects }, { data: invoices }, { data: docs }, { data: emails }, { data: deals }] = await Promise.all([
    db.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    db.from("invoices").select("*").eq("client_id", id).order("issue_date", { ascending: false }),
    db.from("documents").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    db.from("email_log").select("subject, status, sent_at").eq("client_id", id).order("sent_at", { ascending: false }).limit(8),
    db.from("deals").select("id, title, status, service_slugs, total, currency").eq("client_id", id),
  ]);

  const billed = (invoices ?? []).reduce((s, i) => s + Number(i.total), 0);
  const paid = (invoices ?? []).reduce((s, i) => s + Number(i.amount_paid), 0);
  const tenure = getClientTenure(client.created_at || new Date().toISOString());

  // Aggregate active services
  const activeServices = Array.from(
    new Set(
      (deals ?? []).flatMap((d) => (d.service_slugs as string[]) || []).concat(
        (projects ?? []).map((p) => p.name)
      )
    )
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <Link href={`${BASE}/clients`} className="mono-tag hover:text-bone-50 transition-colors">
          ← Back to clients list
        </Link>
        <span className="mono-tag text-xs text-lime-400 bg-lime-400/10 px-3 py-1 rounded-full border border-lime-400/20 inline-flex items-center gap-1.5">
          <CheckCircle2 size={13} /> Active Client
        </span>
      </div>

      <PageHead
        title={client.name}
        sub={[
          client.company ? `Company: ${client.company}` : null,
          client.email,
          [client.city, client.country].filter(Boolean).join(", "),
          client.source ? `Acquisition: ${client.source.charAt(0).toUpperCase() + client.source.slice(1).replace(/_/g, " ")}` : null,
        ].filter(Boolean).join(" · ")}
        action={<Link href={`${BASE}/deals/new`} className="btn btn-primary h-10">Lock a deal</Link>}
      />

      {/* 360 Client Key Summary Banner */}
      <div className="card p-5 border-ink-600 bg-ink-900/60 mb-6 grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-ink-800 border border-ink-600 text-lime-400 shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <p className="mono-tag text-[11px]">Working Together</p>
            <p className="text-sm font-semibold text-bone-50 mt-0.5">
              {tenure} <span className="text-xs font-normal text-bone-400">(since {new Date(client.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-ink-800 border border-ink-600 text-lime-400 shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <p className="mono-tag text-[11px]">Active Services & Packages</p>
            <p className="text-sm font-semibold text-bone-50 mt-0.5">
              {activeServices.length > 0 ? `${activeServices.length} Active ${activeServices.length === 1 ? "Service" : "Services"}` : "Custom Retainer"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-ink-800 border border-ink-600 text-lime-400 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="mono-tag text-[11px]">Portal Status</p>
            <p className="text-sm font-semibold text-bone-50 mt-0.5">
              {client.portal_password_preview ? "Portal Account Ready" : "Pending Credentials"}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total Billed" value={money(billed, client.preferred_currency)} />
        <Stat label="Total Paid" value={money(paid, client.preferred_currency)} tone="good" />
        <Stat label="Outstanding Balance" value={money(billed - paid, client.preferred_currency)} tone={billed - paid > 0 ? "warn" : "default"} />
        <Stat label="Total Projects" value={String(projects?.length ?? 0)} />
      </div>

      {/* Services Badge Bar */}
      {activeServices.length > 0 && (
        <div className="card mt-6 p-4 border-ink-600">
          <p className="mono-tag text-xs text-lime-400 mb-2.5 flex items-center gap-1.5">
            <Layers size={14} /> Services Purchased & In Progress
          </p>
          <div className="flex flex-wrap gap-2">
            {activeServices.map((service) => (
              <span key={service} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800 px-3 py-1.5 text-xs text-bone-100 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                {service}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Credentials & Access Control */}
      <ClientManagerCard client={client} />

      {/* Projects & Invoices */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-medium text-bone-50">Projects ({projects?.length ?? 0})</h2>
          <Table head={["Project", "Progress", "Status"]}>
            {(projects ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-ink-700/30">
                <td className="px-5 py-3">
                  <Link href={`${BASE}/projects/${p.id}`} className="hover:text-lime-400 font-medium">{p.name}</Link>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{p.progress}%</td>
                <td className="px-5 py-3"><Badge>{p.status}</Badge></td>
              </tr>
            ))}
            {!projects?.length && <tr><td colSpan={3} className="px-5 py-8 text-center text-bone-400">No projects yet.</td></tr>}
          </Table>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-bone-50">Invoices ({invoices?.length ?? 0})</h2>
          <Table head={["Invoice", "Total", "Status", ""]}>
            {(invoices ?? []).map((i) => (
              <tr key={i.id} className="hover:bg-ink-700/30">
                <td className="px-5 py-3 font-mono text-xs">{i.invoice_no}</td>
                <td className="px-5 py-3 font-mono text-xs">{money(Number(i.total), i.currency)}</td>
                <td className="px-5 py-3"><Badge>{i.status}</Badge></td>
                <td className="px-5 py-3 text-right"><DocButton type="invoice" id={i.id} label="PDF" /></td>
              </tr>
            ))}
            {!invoices?.length && <tr><td colSpan={4} className="px-5 py-8 text-center text-bone-400">No invoices yet.</td></tr>}
          </Table>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-bone-50">Documents Sent ({docs?.length ?? 0})</h2>
          <Table head={["Document", "Type", "When"]}>
            {(docs ?? []).map((d) => (
              <tr key={d.id}>
                <td className="px-5 py-3 font-medium">{d.title}</td>
                <td className="px-5 py-3"><Badge>{d.type}</Badge></td>
                <td className="px-5 py-3 text-bone-400 font-mono text-xs">{new Date(d.created_at).toLocaleDateString("en-GB")}</td>
              </tr>
            ))}
            {!docs?.length && <tr><td colSpan={3} className="px-5 py-8 text-center text-bone-400">Nothing generated yet.</td></tr>}
          </Table>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-bone-50">Recent Emails ({emails?.length ?? 0})</h2>
          <Table head={["Subject", "Status", "When"]}>
            {(emails ?? []).map((e, i) => (
              <tr key={i}>
                <td className="px-5 py-3 font-medium">{e.subject}</td>
                <td className="px-5 py-3"><Badge>{e.status}</Badge></td>
                <td className="px-5 py-3 text-bone-400 font-mono text-xs">{new Date(e.sent_at).toLocaleDateString("en-GB")}</td>
              </tr>
            ))}
            {!emails?.length && <tr><td colSpan={3} className="px-5 py-8 text-center text-bone-400">No emails sent yet.</td></tr>}
          </Table>
        </section>
      </div>

      {client.notes && (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-medium text-bone-50">Internal Notes</h2>
          <div className="card whitespace-pre-line p-5 text-sm text-bone-200">{client.notes}</div>
        </section>
      )}
    </>
  );
}
