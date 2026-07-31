import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Stat, Table } from "@/components/admin/ui";
import { money, moneyMulti, sumByCurrency } from "@/lib/utils";
import DocButton from "@/components/admin/DocButton";
import ClientManagerCard from "@/components/admin/ClientManagerCard";
import SendInvoiceButton from "@/components/admin/SendInvoiceButton";
import { Calendar, Layers, Clock, CheckCircle2, ShieldCheck, Mail, Globe, Lock } from "lucide-react";

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

import ClientTeamAssignments from "@/components/admin/ClientTeamAssignments";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentStaff();
  if (!me) return null;

  const canManage = me.isPrivileged;

  // Staff may only open a client they are assigned to. 404 rather than 403 so
  // the page does not confirm that an unassigned client exists.
  if (!canManage) {
    const allowed = await assignedClientIds(me.employeeId);
    if (!allowed.includes(id)) notFound();
  }

  const db = createAdminClient();

  const { data: client } = await db.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  const [
    { data: projects },
    { data: invoices },
    { data: docs },
    { data: emails },
    { data: deals },
    { data: assignedEmployees, error: assignedEmployeesError },
    { data: allEmployees },
  ] = await Promise.all([
    db.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    db.from("invoices").select("*").eq("client_id", id).order("issue_date", { ascending: false }),
    db.from("documents").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    db.from("email_log").select("subject, status, sent_at").eq("client_id", id).order("sent_at", { ascending: false }).limit(8),
    db.from("deals").select("id, title, status, service_slugs, total, currency").eq("client_id", id),
    db.from("client_employee_assignments").select("*, employees(id, full_name, email, job_title, seniority, avatar_url)").eq("client_id", id),
    db.from("employees").select("id, full_name, email, job_title, seniority"),
  ]);

  if (assignedEmployeesError) {
    console.error("Failed to load assigned employees for client", id, assignedEmployeesError);
  }

  const lockedDeal = (deals ?? []).find((d) => d.status === "locked") ?? null;
  const lockedProject = lockedDeal
    ? (projects ?? []).find((p) => p.deal_id === lockedDeal.id) ?? (projects ?? [])[0] ?? null
    : null;

  // Grouped per currency, and drafts excluded: a draft is a payment stage that
  // has not been billed yet, so it is neither invoiced nor owed today. Summing
  // raw numbers and labelling the result `preferred_currency` used to show a
  // USD client their total in Rs.
  const issuedInvoices = (invoices ?? []).filter((i) => i.status !== "draft");
  const contract = sumByCurrency(
    (deals ?? []).filter((d) => d.status === "locked"),
    (d) => d.currency,
    (d) => Number(d.total)
  );
  const billed = sumByCurrency(issuedInvoices, (i) => i.currency, (i) => Number(i.total));
  const paid = sumByCurrency(issuedInvoices, (i) => i.currency, (i) => Number(i.amount_paid));

  const paidByCurrency = new Map(paid.map((t) => [t.currency, t.total]));
  const outstanding = (contract.length ? contract : billed)
    .map((t) => ({ currency: t.currency, total: t.total - (paidByCurrency.get(t.currency) ?? 0) }))
    .filter((t) => t.total > 0.009);

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
        action={
          // A locked deal must not lead back to the create form — submitting it
          // again raises a second deal, project, milestone set and invoice.
          lockedProject ? (
            <Link href={`${BASE}/projects/${lockedProject.id}`} className="btn h-10">
              <Lock size={14} /> {canManage ? "Deal locked — open project" : "Open project"}
            </Link>
          ) : !canManage ? undefined : lockedDeal ? (
            <span className="btn h-10 cursor-not-allowed text-bone-500">
              <Lock size={14} /> Deal locked
            </span>
          ) : (
            <Link href={`${BASE}/deals/new`} className="btn btn-primary h-10">Lock a deal</Link>
          )
        }
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

        {canManage && (
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
        )}
      </div>

      {/* Financial Overview — owner/admin only. Staff must not see billing. */}
      {canManage ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Contract value" value={moneyMulti(contract, "—")} />
          <Stat label="Invoiced to date" value={moneyMulti(billed, "—")} />
          <Stat label="Total paid" value={moneyMulti(paid, "—")} tone="good" />
          <Stat
            label="Outstanding balance"
            value={moneyMulti(outstanding, contract.length || billed.length ? "Settled in full" : "—")}
            tone={outstanding.length ? "warn" : "default"}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat label="Projects" value={String(projects?.length ?? 0)} />
          <Stat label="Working together" value={tenure} />
        </div>
      )}

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

      {/* Credentials, password reset, permissions and delete — owner/admin only. */}
      {canManage && <ClientManagerCard client={client} />}

      {/* Assigned team. Read-only for staff: letting an employee change
          assignments would let them grant themselves any client. */}
      {canManage ? (
        <ClientTeamAssignments
          clientId={id}
          assignedEmployees={assignedEmployees ?? []}
          allEmployees={allEmployees ?? []}
          loadError={assignedEmployeesError?.message ?? null}
        />
      ) : (
        !!assignedEmployees?.length && (
          <div className="card my-6 border-ink-600 p-5">
            <h2 className="text-base font-semibold text-bone-50">Team on this client</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(assignedEmployees as any[]).map((a) =>
                a.employees ? (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800 px-3 py-1.5 text-xs text-bone-100"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                    {a.employees.full_name}
                    <span className="text-bone-300">· {a.employees.job_title}</span>
                  </span>
                ) : null
              )}
            </div>
          </div>
        )
      )}

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

        {canManage && (
          <section>
            <h2 className="mb-3 text-base font-medium text-bone-50">Invoices ({invoices?.length ?? 0})</h2>
            <Table head={["Invoice", "Total", "Status", ""]}>
              {(invoices ?? []).map((i) => (
                <tr key={i.id} className="hover:bg-ink-700/30">
                  <td className="px-5 py-3 font-mono text-xs">{i.invoice_no}</td>
                  <td className="px-5 py-3 font-mono text-xs">{money(Number(i.total), i.currency)}</td>
                  <td className="px-5 py-3"><Badge>{i.status}</Badge></td>
                  <td className="px-5 py-3 text-right">
                    {/* Drafts are scheduled stages — issue one before there is
                        anything to send the client a PDF of. */}
                    {i.status === "draft" ? (
                      <SendInvoiceButton
                        invoice={{
                          id: i.id, invoice_no: i.invoice_no, currency: i.currency,
                          total: Number(i.total), client_name: client.name,
                        }}
                      />
                    ) : (
                      <DocButton type="invoice" id={i.id} label="PDF" />
                    )}
                  </td>
                </tr>
              ))}
              {!invoices?.length && <tr><td colSpan={4} className="px-5 py-8 text-center text-bone-300">No invoices yet.</td></tr>}
            </Table>
          </section>
        )}

        {canManage && (
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
            {!docs?.length && <tr><td colSpan={3} className="px-5 py-8 text-center text-bone-300">Nothing generated yet.</td></tr>}
          </Table>
        </section>
        )}

        {canManage && (
        <section>
          <h2 className="mb-3 text-base font-medium text-bone-50">Recent Emails ({emails?.length ?? 0})</h2>
          <Table head={["Subject", "Status", "When"]}>
            {(emails ?? []).map((e, i) => (
              <tr key={i}>
                <td className="px-5 py-3 font-medium">{e.subject}</td>
                <td className="px-5 py-3"><Badge>{e.status}</Badge></td>
                <td className="px-5 py-3 text-bone-300 font-mono text-xs">{new Date(e.sent_at).toLocaleDateString("en-GB")}</td>
              </tr>
            ))}
            {!emails?.length && <tr><td colSpan={3} className="px-5 py-8 text-center text-bone-300">No emails sent yet.</td></tr>}
          </Table>
        </section>
        )}
      </div>

      {/* Internal notes can hold commercial detail — owner/admin only. */}
      {canManage && client.notes && (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-medium text-bone-50">Internal Notes</h2>
          <div className="card whitespace-pre-line p-5 text-sm text-bone-200">{client.notes}</div>
        </section>
      )}
    </>
  );
}
