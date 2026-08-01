import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { PageHead, Badge, Stat, Table } from "@/components/admin/ui";
import { money, moneyMulti, sumByCurrency } from "@/lib/utils";
import DocButton from "@/components/admin/DocButton";
import ClientManagerCard from "@/components/admin/ClientManagerCard";
import SendInvoiceButton from "@/components/admin/SendInvoiceButton";
import ClientServices from "@/components/admin/ClientServices";
import ClientLifecycleCard from "@/components/admin/ClientLifecycleCard";
import ActivityTimeline from "@/components/admin/ActivityTimeline";
import { clientActivity } from "@/lib/insights";
import { revealPreview } from "@/lib/crypto";
import { Calendar, Layers, Clock, CheckCircle2, ShieldCheck, Mail, Globe, Lock, Plus } from "lucide-react";

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
    { data: deals, error: dealsError },
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

  // Never swallow this. A select naming a column that does not exist returns an
  // error and NULL data, so the page renders a client with no contract value
  // and no services and looks merely empty rather than broken — which is
  // exactly how a missing `deals.service_slugs` hid for so long.
  if (dealsError) {
    console.error("Failed to load deals for client", id, dealsError);
  }

  if (assignedEmployeesError) {
    console.error("Failed to load assigned employees for client", id, assignedEmployeesError);
  }

  // Deals are found by `client_id`, but a project also carries `deal_id` — so a
  // deal whose client_id is wrong (a duplicate client row from an old lead
  // conversion, for example) would leave this page insisting the client has no
  // deal, showing "Lock a deal" and a blank contract value even though the
  // agreement exists. Resolve through the projects as a second route.
  const dealIdsViaProjects = (projects ?? []).map((p) => p.deal_id).filter(Boolean) as string[];
  const { data: dealsViaProjects } = dealIdsViaProjects.length
    ? await db.from("deals")
        .select("id, title, status, service_slugs, total, currency")
        .in("id", dealIdsViaProjects)
    : { data: [] as any[] };

  const allDeals = Array.from(
    new Map([...(deals ?? []), ...(dealsViaProjects ?? [])].map((d: any) => [d.id, d])).values()
  );

  const lockedDeal = allDeals.find((d: any) => d.status === "locked") ?? null;
  const lockedProject = lockedDeal
    ? (projects ?? []).find((p) => p.deal_id === lockedDeal.id) ?? (projects ?? [])[0] ?? null
    : null;

  // Grouped per currency, and drafts excluded: a draft is a payment stage that
  // has not been billed yet, so it is neither invoiced nor owed today. Summing
  // raw numbers and labelling the result `preferred_currency` used to show a
  // USD client their total in Rs.
  const issuedInvoices = (invoices ?? []).filter((i) => i.status !== "draft");
  const contract = sumByCurrency(
    allDeals.filter((d: any) => d.status === "locked"),
    (d: any) => d.currency,
    (d: any) => Number(d.total)
  );
  const billed = sumByCurrency(issuedInvoices, (i) => i.currency, (i) => Number(i.total));
  const paid = sumByCurrency(issuedInvoices, (i) => i.currency, (i) => Number(i.amount_paid));

  const paidByCurrency = new Map(paid.map((t) => [t.currency, t.total]));
  const outstanding = (contract.length ? contract : billed)
    .map((t) => ({ currency: t.currency, total: t.total - (paidByCurrency.get(t.currency) ?? 0) }))
    .filter((t) => t.total > 0.009);

  const tenure = getClientTenure(client.created_at || new Date().toISOString());

  // Each locked deal is one service the client bought, with its own project and
  // its own invoices. Numbered in the order they were sold.
  const services = allDeals
    .filter((d: any) => d.status === "locked")
    .map((d: any) => ({
      deal: d,
      project: (projects ?? []).find((p) => p.deal_id === d.id) ?? null,
      invoices: (invoices ?? []).filter((v) => v.deal_id === d.id),
    }))
    .sort(
      (a, b) =>
        new Date(a.project?.created_at ?? 0).getTime() -
        new Date(b.project?.created_at ?? 0).getTime()
    );

  // Everything that has happened on this account. `audit_log` has been
  // written on every privileged action since Phase 5 and read by nothing.
  const activity = canManage ? await clientActivity(id) : [];

  // Referral graph, both directions.
  const [{ data: referrer }, { data: referred }, { data: referralCandidates }] = await Promise.all([
    client.referred_by_client_id
      ? db.from("clients").select("id, name, company").eq("id", client.referred_by_client_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("clients").select("id, name, company").eq("referred_by_client_id", id),
    // Anyone but this client can be the referrer.
    db.from("clients").select("id, name, company").neq("id", id).order("name"),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <Link href={`${BASE}/clients`} className="mono-tag hover:text-bone-50 transition-colors">
          ← Back to clients list
        </Link>
        {/* Was hardcoded to "Active Client" for everyone, including clients
            whose work finished two years ago. */}
        <span
          className={`mono-tag inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
            client.lifecycle === "dormant"
              ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
              : client.lifecycle === "archived"
                ? "border-ink-500 bg-ink-800 text-bone-300"
                : "border-lime-400/20 bg-lime-400/10 text-lime-400"
          }`}
        >
          <CheckCircle2 size={13} />
          {client.lifecycle === "dormant"
            ? "Dormant"
            : client.lifecycle === "archived"
              ? "Archived"
              : "Active client"}
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
          // Selling a second service is normal, so this no longer dead-ends at
          // "Deal locked" — it offers the next one. Each becomes its own deal,
          // project and invoice schedule.
          !canManage ? (
            lockedProject ? (
              <Link href={`${BASE}/projects/${lockedProject.id}`} className="btn h-10">
                Open project
              </Link>
            ) : undefined
          ) : services.length ? (
            <Link href={`${BASE}/deals/new?client=${id}`} className="btn btn-primary h-10">
              <Plus size={14} /> Add another service
            </Link>
          ) : (
            <Link href={`${BASE}/deals/new?client=${id}`} className="btn btn-primary h-10">
              <Lock size={14} /> Lock the first deal
            </Link>
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
            <p className="mono-tag text-[11px]">Services booked</p>
            <p className="mt-0.5 text-sm font-semibold text-bone-50">
              {services.length > 0
                ? `${services.length} ${services.length === 1 ? "service" : "services"}`
                : "Nothing booked yet"}
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

      {/* Every service they bought, numbered and expandable. A flat badge bar
          stopped making sense the moment anyone bought a second thing. */}
      <ClientServices clientId={id} services={services} canManage={canManage} />

      {canManage && (
        <div className="mt-6">
          <ActivityTimeline entries={activity} />
        </div>
      )}

      {canManage && (
        <ClientLifecycleCard
          client={client}
          referrer={referrer ?? null}
          referred={referred ?? []}
          candidates={referralCandidates ?? []}
        />
      )}

      {/* Credentials, password reset, permissions and delete — owner/admin only. */}
      {/* The stored password is ciphertext with a 72-hour window; it is
          decrypted here, server-side, and only while still fresh. */}
      {canManage && (
        <ClientManagerCard
          client={{ ...client, portal_password_preview: revealPreview(client) }}
        />
      )}

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
