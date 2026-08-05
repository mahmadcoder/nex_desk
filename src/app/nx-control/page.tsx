import Link from "next/link";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Stat, Badge, Table } from "@/components/admin/ui";
import { money } from "@/lib/utils";
import DashboardCurrencyTabs from "@/components/admin/DashboardCurrencyTabs";
import StaffDashboard from "@/components/admin/StaffDashboard";
import { getLiveExchangeRates, convertCurrency } from "@/lib/currency";
import { atRiskClients } from "@/lib/insights";
import { expenseInvoiceIds } from "@/lib/billing";
import { AlertTriangle } from "lucide-react";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "Control" };
export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ curr?: string; mode?: string }>;
}) {
  const me = await getCurrentStaff();
  if (!me) return null; // middleware redirects; nothing to render

  // Everything below this line is agency-wide money and pipeline data. Employees
  // get their own scoped, money-free dashboard instead.
  if (!me.isPrivileged) return <StaffDashboard me={me} />;

  // The URL wins so a shared link still works; otherwise fall back to what the
  // tabs last remembered. Without the cookie, every link back to the dashboard
  // targets the bare path and silently reset the view to PKR / Strict.
  const { curr, mode: rawMode } = await searchParams;
  const jar = await cookies();

  const filterCurr = (curr || jar.get("nx_dash_curr")?.value || "").toUpperCase() || null;
  const modeSource = rawMode || jar.get("nx_dash_mode")?.value;
  const mode = modeSource === "converted" ? "converted" : "strict";

  const db = createAdminClient();
  const monthStart = new Date(new Date().setDate(1)).toISOString().slice(0, 10);

  const [payments, invoices, projects, leads, deals, changeRequests, purchases, rates] = await Promise.all([
    db.from("payments").select("invoice_id, amount, currency, paid_on, exchange_rate, realized_base_amount").gte("paid_on", monthStart),
    db.from("invoices").select("id, invoice_no, total, amount_paid, currency, status, due_date, clients(name)")
      .in("status", ["sent", "partial", "overdue"]).order("due_date"),
    db.from("projects").select("id, name, status, progress, deadline, clients(name)")
      .not("status", "in", "(completed,cancelled)").order("deadline"),
    // Spam is excluded outright — it must not inflate the new-lead count or
    // push a real enquiry off the "Latest leads" list.
    db.from("leads").select("id, name, email, company, status, created_at, service_slugs")
      .neq("status", "spam")
      .order("created_at", { ascending: false }).limit(6),
    db.from("deals").select("total, currency, status").eq("status", "locked"),
    // Extra work the client agreed to buy is booked revenue too — it just
    // lives in a different table, which is why it never appeared here.
    db.from("change_requests")
      .select("quoted_amount, currency, status")
      .in("status", ["approved", "invoiced", "completed"]),
    // Things bought on a client's behalf and re-billed. Only their invoice ids
    // are wanted here — enough to take them back out of Revenue.
    db.from("project_expenses").select("invoice_id").not("invoice_id", "is", null),
    getLiveExchangeRates(),
  ]);

  // A domain bought at $110 and re-billed at $150 is not $150 of revenue: $110
  // of it is money passing straight through us to a registrar. Both halves live
  // on the Purchases page instead, so counting the client's payment here while
  // the cost sits elsewhere would overstate what the agency actually earned.
  //
  // Change requests are deliberately NOT excluded — extra work a client agreed
  // to buy is ordinary revenue and belongs in every total.
  const purchaseInvoices = expenseInvoiceIds(purchases.data ?? []);
  const tradingPayments = (payments.data ?? []).filter(
    (p: any) => !p.invoice_id || !purchaseInvoices.has(p.invoice_id)
  );

  let displayCurrency = filterCurr || "PKR";
  let revenue = 0;
  let outstanding = 0;
  let booked = 0;
  let displayInvoices = invoices.data ?? [];

  if (mode === "strict") {
    // Mode 1: Strict Contract Currency (Exact Contract Values)
    if (filterCurr) {
      const pList = tradingPayments.filter((p: any) => p.currency === filterCurr);
      revenue = pList.reduce((s, p) => s + Number(p.amount), 0);

      displayInvoices = (invoices.data ?? []).filter((i) => i.currency === filterCurr);
      outstanding = displayInvoices.reduce((s, i) => s + (Number(i.total) - Number(i.amount_paid)), 0);

      const dList = (deals.data ?? []).filter((d) => d.currency === filterCurr);
      const cList = (changeRequests.data ?? []).filter((c) => c.currency === filterCurr);
      booked =
        dList.reduce((s, d) => s + Number(d.total), 0) +
        cList.reduce((s, c) => s + Number(c.quoted_amount || 0), 0);
    } else {
      // ALL Currencies -> Sum in PKR equivalent using realized / contract base
      revenue = tradingPayments.reduce((s: number, p: any) => {
        if (p.realized_base_amount) return s + Number(p.realized_base_amount);
        return s + convertCurrency(Number(p.amount), p.currency || "PKR", "PKR", rates);
      }, 0);
      outstanding = (invoices.data ?? []).reduce((s, i) => s + convertCurrency(Number(i.total) - Number(i.amount_paid), i.currency || "PKR", "PKR", rates), 0);
      booked =
        (deals.data ?? []).reduce((s, d) => s + convertCurrency(Number(d.total), d.currency || "PKR", "PKR", rates), 0) +
        (changeRequests.data ?? []).reduce((s, c) => s + convertCurrency(Number(c.quoted_amount || 0), c.currency || "PKR", "PKR", rates), 0);
      displayCurrency = "PKR";
    }
  } else {
    // Mode 2: Live Converted View
    revenue = tradingPayments.reduce((sum: number, p: any) => {
      // Historical rate lock for payment revenue
      if (p.realized_base_amount) {
        return sum + convertCurrency(Number(p.realized_base_amount), "PKR", displayCurrency, rates);
      }
      const pRate = p.exchange_rate || rates[p.currency] || 1.0;
      const amountUSD = (Number(p.amount) || 0) / pRate;
      return sum + (amountUSD * (rates[displayCurrency] || 1.0));
    }, 0);

    outstanding = (invoices.data ?? []).reduce((sum, i) => {
      const balanceNum = (Number(i.total) - Number(i.amount_paid)) || 0;
      return sum + convertCurrency(balanceNum, i.currency || "PKR", displayCurrency, rates);
    }, 0);

    booked =
      (deals.data ?? []).reduce((sum, d) => {
        return sum + convertCurrency(Number(d.total), d.currency || "PKR", displayCurrency, rates);
      }, 0) +
      (changeRequests.data ?? []).reduce((sum, c) => {
        return sum + convertCurrency(Number(c.quoted_amount || 0), c.currency || "PKR", displayCurrency, rates);
      }, 0);
  }

  // Who is off, and what is waiting on a decision. Leave that nobody sees is
  // leave that gets approved straight into a deadline.
  const weekEnd = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);

  const [{ data: offSoon }, { count: pendingLeave }] = await Promise.all([
    db.from("leave_requests")
      .select("start_date, end_date, leave_type, employees(full_name)")
      .eq("status", "approved")
      .lte("start_date", weekEnd)
      .gte("end_date", todayStr)
      .order("start_date"),
    db.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  // Accounts that need attention today. Totals hide all three of these.
  const risks = await atRiskClients();

  const overdue = (invoices.data ?? []).filter((i) => i.status === "overdue").length;
  const newLeads = (leads.data ?? []).filter((l) => l.status === "new").length;

  return (
    <>
      <PageHead
        title="Dashboard"
        sub={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        action={<Link href={`${BASE}/deals/new`} className="btn btn-primary h-10">Lock a deal</Link>}
      />

      {!!risks.length && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-base">
            <AlertTriangle size={15} className="text-amber-400" /> Needs attention ({risks.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {risks.slice(0, 6).map((r) => (
              <Link
                key={r.clientId}
                href={BASE + `/clients/` + r.clientId}
                className={`card p-4 transition-colors hover:border-lime-400/40 ${
                  r.severity === "high" ? "border-rose-500/30" : "border-amber-400/25"
                }`}
              >
                <p className="text-sm font-semibold text-bone-50">{r.clientName}</p>
                <ul className="mt-2 space-y-1">
                  {r.reasons.map((reason) => (
                    <li
                      key={reason}
                      className={`text-xs leading-relaxed ${
                        r.severity === "high" ? "text-rose-300" : "text-amber-300"
                      }`}
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(!!offSoon?.length || !!pendingLeave) && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-ink-600 bg-ink-900/70 p-3.5">
          <span className="mono-tag text-[11px] text-lime-400">Team availability</span>
          {offSoon?.map((l: any, i: number) => (
            <span
              key={i}
              className="mono-tag rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] leading-none text-amber-300"
            >
              {l.employees?.full_name ?? "Someone"} off {l.start_date} → {l.end_date}
            </span>
          ))}
          {!offSoon?.length && (
            <span className="text-xs text-bone-300">Everyone is in this week.</span>
          )}
          {!!pendingLeave && (
            <Link
              href={BASE + `/leave`}
              className="mono-tag rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-1 text-[11px] leading-none text-lime-300 hover:bg-lime-400/20"
            >
              {pendingLeave} awaiting your decision →
            </Link>
          )}
        </div>
      )}

      {/* Currency & Mode Switcher Tabs */}
      <DashboardCurrencyTabs currency={filterCurr ?? "ALL"} mode={mode} />

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          label={`Revenue (${displayCurrency})`}
          value={money(revenue, displayCurrency)}
          tone="good"
          hint={
            mode === "strict"
              ? "Our own work. Historical rates locked"
              : `Our own work. Converted to ${displayCurrency}`
          }
        />
        <Stat
          label={`Outstanding (${displayCurrency})`}
          value={money(outstanding, displayCurrency)}
          hint={`${displayInvoices.length} unpaid invoices`}
          tone={outstanding > 0 ? "warn" : "default"}
        />
        <Stat label="Overdue" value={String(overdue)} tone={overdue ? "warn" : "default"} />
        <Stat label="Active projects" value={String(projects.data?.length ?? 0)} />
        <Stat label="New leads" value={String(newLeads)} hint={`${leads.data?.length ?? 0} total recent`} />
      </div>

      {/* Without this line, Revenue quietly stops matching the bank and nothing
          on screen says why. It carries no figure on purpose. */}
      {!!purchaseInvoices.size && (
        <p className="mt-3 text-xs text-bone-400">
          Revenue counts our own work only. What clients paid for things we bought on their
          behalf is kept in{" "}
          <Link href={`${BASE}/purchases`} className="text-lime-400 hover:underline">
            Purchases
          </Link>
          , with what each one cost us.
        </p>
      )}

      {/* xl, not lg: each column here holds a table with its own 560px
          minimum, and at 1024px minus the sidebar that leaves ~348px — so
          lg:grid-cols-2 made both tables scroll sideways on a laptop. */}
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
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
            {(displayInvoices ?? []).slice(0, 6).map((i) => {
              const balanceNum = Number(i.total) - Number(i.amount_paid);
              return (
                <tr key={i.id} className="hover:bg-ink-700/30">
                  <td className="px-5 py-3 font-mono text-xs text-bone-300">{i.invoice_no}</td>
                  <td className="px-5 py-3 text-bone-400">{(i.clients as unknown as { name: string })?.name}</td>
                  <td className="px-5 py-3">{money(balanceNum, i.currency)}</td>
                  <td className="px-5 py-3"><Badge>{i.status}</Badge></td>
                </tr>
              );
            })}
            {!displayInvoices.length && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-bone-400">Everything is paid or no invoices match filter.</td></tr>
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

      <p className="mono-tag mt-10 text-bone-300">
        Booked & locked to date ({displayCurrency}):{" "}
        <strong className="text-lime-400 font-mono text-base">{money(booked, displayCurrency)}</strong>
      </p>
    </>
  );
}
