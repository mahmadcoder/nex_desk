import { createAdminClient } from "@/lib/supabase/server";
import { hourlyRates } from "@/lib/projectCost";
import type { Range } from "@/lib/dates";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The five reports, as plain row arrays.
 *
 * Each returns something a table can render AND `downloadCsv` can take without
 * reshaping — so the file somebody exports is exactly the figures they were
 * looking at, rather than a second query that might disagree.
 *
 * Money is NOT converted between currencies here. Every row carries its own,
 * because a single "total" across PKR and USD is a number that means nothing,
 * and the FX rate on the day of export is not the rate on the day of the
 * invoice.
 */

export type ReportRow = Record<string, unknown>;

const within = (d: string | null | undefined, r: Range) => !!d && d >= r.from && d <= r.to;

/** Money in, by client and month, from payments actually received. */
export async function revenueReport(range: Range): Promise<ReportRow[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("payments")
    .select("paid_on, amount, currency, method, clients(name), invoices(invoice_no)")
    .gte("paid_on", range.from)
    .lte("paid_on", range.to)
    .order("paid_on", { ascending: false });

  return (data ?? []).map((p: any) => ({
    Date: p.paid_on,
    Client: p.clients?.name ?? "—",
    Invoice: p.invoices?.invoice_no ?? "—",
    Amount: Number(p.amount ?? 0),
    Currency: p.currency,
    Method: String(p.method ?? "").replace(/_/g, " "),
  }));
}

/** Hours, tasks and cost per person over the range. */
export async function employeeReport(range: Range): Promise<ReportRow[]> {
  const db = createAdminClient();

  const [{ data: employees }, { data: entries }, { data: logs }, { data: tasks }, { data: att }] =
    await Promise.all([
      db
        .from("employees")
        .select("id, full_name, job_title, salary_amount, salary_currency, department_id")
        .neq("status", "Terminated")
        .order("full_name"),
      db
        .from("time_entries")
        .select("employee_id, duration_sec, started_at")
        .not("ended_at", "is", null)
        .gte("started_at", `${range.from}T00:00:00`)
        .lte("started_at", `${range.to}T23:59:59`),
      db
        .from("daily_work_logs")
        .select("employee_id, hours_spent, work_date")
        .gte("work_date", range.from)
        .lte("work_date", range.to),
      db.from("tasks").select("assigned_employee_id, status, due_date, done_at"),
      db
        .from("attendance")
        .select("employee_id, work_date, checked_in_at")
        .gte("work_date", range.from)
        .lte("work_date", range.to),
    ]);

  const rates = hourlyRates(employees ?? []);

  return (employees ?? []).map((e: any) => {
    const trackedSec = (entries ?? [])
      .filter((t: any) => t.employee_id === e.id)
      .reduce((s: number, t: any) => s + Number(t.duration_sec ?? 0), 0);

    const loggedHours = (logs ?? [])
      .filter((l: any) => l.employee_id === e.id)
      .reduce((s: number, l: any) => s + Number(l.hours_spent ?? 0), 0);

    const mine = (tasks ?? []).filter((t: any) => t.assigned_employee_id === e.id);
    const done = mine.filter((t: any) => t.status === "done" && within(t.done_at?.slice(0, 10), range));
    const late = done.filter((t: any) => t.due_date && t.done_at?.slice(0, 10) > t.due_date);

    const trackedHours = Math.round((trackedSec / 3600) * 10) / 10;
    const rate = rates.get(e.id);

    return {
      Employee: e.full_name,
      Role: e.job_title,
      "Tracked hours": trackedHours,
      "Logged hours": Math.round(loggedHours * 10) / 10,
      "Days attended": new Set(
        (att ?? []).filter((a: any) => a.employee_id === e.id && a.checked_in_at).map((a: any) => a.work_date)
      ).size,
      "Tasks done": done.length,
      "Tasks late": late.length,
      "Labour cost": rate ? Math.round(trackedHours * rate.hourly) : 0,
      Currency: rate?.currency ?? "USD",
    };
  });
}

/** Delivery and money per project. */
export async function projectReport(range: Range): Promise<ReportRow[]> {
  const db = createAdminClient();

  const [{ data: projects }, { data: invoices }, { data: entries }] = await Promise.all([
    db
      .from("projects")
      .select(
        "id, name, status, progress, start_date, deadline, estimated_delivery, delivered_at, budget, clients(name), deals(total, currency)"
      )
      .gte("created_at", `${range.from}T00:00:00`)
      .lte("created_at", `${range.to}T23:59:59`),
    db.from("invoices").select("project_id, amount_paid, currency, status"),
    db.from("time_entries").select("project_id, duration_sec").not("ended_at", "is", null),
  ]);

  return (projects ?? []).map((p: any) => {
    const paid = (invoices ?? [])
      .filter((i: any) => i.project_id === p.id)
      .reduce((s: number, i: any) => s + Number(i.amount_paid ?? 0), 0);

    const sec = (entries ?? [])
      .filter((t: any) => t.project_id === p.id)
      .reduce((s: number, t: any) => s + Number(t.duration_sec ?? 0), 0);

    const late =
      p.delivered_at && p.deadline
        ? p.delivered_at.slice(0, 10) > p.deadline
        : p.deadline
          ? p.deadline < new Date().toISOString().slice(0, 10) && !p.delivered_at
          : false;

    return {
      Project: p.name,
      Client: p.clients?.name ?? "—",
      Status: String(p.status).replace(/_/g, " "),
      "Progress %": Number(p.progress ?? 0),
      Deadline: p.deadline ?? "",
      "Estimated delivery": p.estimated_delivery ?? "",
      Delivered: p.delivered_at?.slice(0, 10) ?? "",
      "Late?": late,
      "Contract value": Number(p.deals?.total ?? 0),
      "Paid to date": paid,
      Budget: Number(p.budget ?? 0),
      "Tracked hours": Math.round((sec / 3600) * 10) / 10,
      Currency: p.deals?.currency ?? "USD",
    };
  });
}

/** One line per client: what they are worth and how they are doing. */
export async function clientReport(range: Range): Promise<ReportRow[]> {
  const db = createAdminClient();

  const [{ data: clients }, { data: payments }, { data: invoices }, { data: projects }, { data: tickets }] =
    await Promise.all([
      db.from("clients").select("id, name, company, lifecycle, created_at, preferred_currency").order("name"),
      db.from("payments").select("client_id, amount, currency, paid_on"),
      db.from("invoices").select("client_id, total, amount_paid, status"),
      db.from("projects").select("client_id, status"),
      db.from("tickets").select("client_id, status"),
    ]);

  return (clients ?? []).map((c: any) => {
    const paidInRange = (payments ?? [])
      .filter((p: any) => p.client_id === c.id && within(p.paid_on, range))
      .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);

    const lifetime = (payments ?? [])
      .filter((p: any) => p.client_id === c.id)
      .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);

    const owed = (invoices ?? [])
      .filter((i: any) => i.client_id === c.id && i.status !== "paid" && i.status !== "draft")
      .reduce((s: number, i: any) => s + (Number(i.total ?? 0) - Number(i.amount_paid ?? 0)), 0);

    const theirProjects = (projects ?? []).filter((p: any) => p.client_id === c.id);

    return {
      Client: c.name,
      Company: c.company ?? "",
      Status: c.lifecycle ?? "active",
      Since: c.created_at?.slice(0, 10) ?? "",
      Projects: theirProjects.length,
      "Live projects": theirProjects.filter(
        (p: any) => !["completed", "cancelled", "delivered"].includes(p.status)
      ).length,
      "Paid in range": paidInRange,
      "Lifetime value": lifetime,
      Outstanding: owed,
      "Open tickets": (tickets ?? []).filter(
        (t: any) => t.client_id === c.id && ["open", "in_progress", "waiting_client"].includes(t.status)
      ).length,
      Currency: c.preferred_currency ?? "USD",
    };
  });
}

/** Money out: agency overheads and project outlays, in one list. */
export async function expenseReport(range: Range): Promise<ReportRow[]> {
  const db = createAdminClient();

  const [{ data: agency }, { data: project }] = await Promise.all([
    db
      .from("agency_expenses")
      .select("*")
      .gte("incurred_on", range.from)
      .lte("incurred_on", range.to),
    db
      .from("project_expenses")
      .select("*, projects(name), clients(name)")
      .gte("incurred_on", range.from)
      .lte("incurred_on", range.to),
  ]);

  const rows: ReportRow[] = [
    ...(agency ?? []).map((x: any) => ({
      Date: x.incurred_on,
      Kind: "Agency overhead",
      Item: x.label ?? x.category,
      Category: x.category,
      For: "—",
      Cost: Number(x.amount ?? x.cost ?? 0),
      "Billed on": 0,
      Currency: x.currency ?? "USD",
    })),
    ...(project ?? []).map((x: any) => ({
      Date: x.incurred_on,
      Kind: "Project outlay",
      Item: x.label,
      Category: x.category,
      For: x.projects?.name ?? x.clients?.name ?? "—",
      Cost: Number(x.cost ?? 0),
      // The re-bill. A domain bought at 12 and billed at 12 is not a cost —
      // showing only one side is how every purchase looks like pure loss.
      "Billed on": Number(x.bill_amount ?? 0),
      Currency: x.currency ?? "USD",
    })),
  ];

  return rows.sort((a, b) => String(b.Date).localeCompare(String(a.Date)));
}

export const REPORTS = [
  { key: "revenue", label: "Revenue", build: revenueReport },
  { key: "employee", label: "Employees", build: employeeReport },
  { key: "project", label: "Projects", build: projectReport },
  { key: "client", label: "Clients", build: clientReport },
  { key: "expense", label: "Expenses", build: expenseReport },
] as const;

export type ReportKey = (typeof REPORTS)[number]["key"];
