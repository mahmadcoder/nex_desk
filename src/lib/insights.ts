import { createAdminClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Read-only derivations over data the app already stores.
 *
 * Server-only helpers, not server actions — every caller is already a guarded
 * page, so adding a second auth check here would only duplicate it.
 */

/* ============================================================
   ACTIVITY TIMELINE
   ============================================================ */

/** Turns an audit action key into something a human would say. */
const ACTION_COPY: Record<string, string> = {
  "client.create": "Client created",
  "client.update": "Client details updated",
  "client.credentials": "Portal credentials sent",
  "client.dormant": "Marked dormant",
  "client.reactivate": "Reactivated",
  "client.referrer": "Referrer recorded",
  "deal.lock": "Deal locked",
  "deal.accepted": "Agreement accepted by the client",
  "invoice.send": "Invoice issued",
  "payment.record": "Payment recorded",
  "project.handover": "Project handed over",
  "project.thank_you": "Thank-you sent",
  "project.update": "Project updated",
  "change_request.quote": "Change quoted",
  "change_request.approve": "Change approved and invoiced",
  "change_request.complete": "Change completed",
  "change_request.decline": "Change declined",
  "milestone.toggle": "Milestone ticked",
};

export type ActivityEntry = {
  id: string;
  at: string;
  label: string;
  actor: string | null;
  detail: string | null;
};

/**
 * Everything that has happened on a client account.
 *
 * `audit_log` has recorded every privileged action since Phase 5 and nothing
 * has ever read it back — so "what happened on this account, and when" was
 * unanswerable despite the data existing all along.
 */
export async function clientActivity(clientId: string, limit = 25): Promise<ActivityEntry[]> {
  const db = createAdminClient();

  // Actions are recorded against several entities, so collect the ids that
  // belong to this client before querying the log.
  const [{ data: deals }, { data: projects }, { data: invoices }] = await Promise.all([
    db.from("deals").select("id").eq("client_id", clientId),
    db.from("projects").select("id").eq("client_id", clientId),
    db.from("invoices").select("id").eq("client_id", clientId),
  ]);

  const ids = [
    clientId,
    ...(deals ?? []).map((d) => d.id),
    ...(projects ?? []).map((p) => p.id),
    ...(invoices ?? []).map((i) => i.id),
  ];

  const { data: rows } = await db
    .from("audit_log")
    .select("id, action, entity, entity_id, meta, created_at, profiles(full_name, email)")
    .in("entity_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (rows ?? []).map((r: any) => ({
    id: r.id,
    at: r.created_at,
    label: ACTION_COPY[r.action] ?? String(r.action).replace(/[._]/g, " "),
    actor: r.profiles?.full_name ?? r.profiles?.email ?? null,
    detail: summariseMeta(r.action, r.meta),
  }));
}

function summariseMeta(action: string, meta: any): string | null {
  if (!meta || typeof meta !== "object") return null;
  if (meta.invoice_no) return String(meta.invoice_no);
  if (meta.amount !== undefined) return `${meta.currency ?? ""} ${meta.amount}`.trim();
  if (action === "deal.lock" && meta.total) return `Contract ${meta.total}`;
  if (meta.staff_notified !== undefined) return `${meta.staff_notified} staff notified`;
  return null;
}

/* ============================================================
   AT-RISK CLIENTS
   ============================================================ */

export type RiskFlag = {
  clientId: string;
  clientName: string;
  reasons: string[];
  severity: "high" | "medium";
};

/**
 * Accounts that need attention today.
 *
 * Three signals, all of which are invisible on a dashboard of totals:
 *   · money overdue
 *   · a live project nobody has logged work on for a week
 *   · a deadline inside three days with the work under 60% done
 */
export async function atRiskClients(): Promise<RiskFlag[]> {
  const db = createAdminClient();

  const today = new Date().toISOString().slice(0, 10);
  const in3Days = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);

  const [{ data: overdue }, { data: liveProjects }, { data: recentLogs }] = await Promise.all([
    db.from("invoices")
      .select("client_id, total, amount_paid, currency, clients(name)")
      .eq("status", "overdue"),
    db.from("projects")
      .select("id, name, progress, deadline, client_id, clients(name)")
      .not("status", "in", "(completed,cancelled,delivered)"),
    db.from("daily_work_logs").select("project_id").gte("work_date", weekAgo),
  ]);

  const loggedRecently = new Set((recentLogs ?? []).map((l) => l.project_id));
  const byClient = new Map<string, RiskFlag>();

  const add = (clientId: string, name: string, reason: string, severity: "high" | "medium") => {
    const existing = byClient.get(clientId);
    if (existing) {
      existing.reasons.push(reason);
      if (severity === "high") existing.severity = "high";
      return;
    }
    byClient.set(clientId, { clientId, clientName: name, reasons: [reason], severity });
  };

  for (const inv of overdue ?? []) {
    const balance = Number(inv.total) - Number(inv.amount_paid);
    if (balance <= 0.01) continue;
    add(
      inv.client_id,
      (inv.clients as any)?.name ?? "Client",
      `${inv.currency} ${balance.toLocaleString()} overdue`,
      "high"
    );
  }

  for (const p of liveProjects ?? []) {
    const name = (p.clients as any)?.name ?? "Client";

    if (!loggedRecently.has(p.id)) {
      add(p.client_id, name, `No work logged on ${p.name} for 7 days`, "medium");
    }

    if (p.deadline && p.deadline >= today && p.deadline <= in3Days && Number(p.progress) < 60) {
      add(
        p.client_id,
        name,
        `${p.name} is ${p.progress}% done and due ${p.deadline}`,
        "high"
      );
    }

    // A deadline already gone by on a project still marked live.
    if (p.deadline && p.deadline < today) {
      add(p.client_id, name, `${p.name} passed its deadline on ${p.deadline}`, "high");
    }
  }

  return [...byClient.values()].sort((a, b) =>
    a.severity === b.severity ? b.reasons.length - a.reasons.length : a.severity === "high" ? -1 : 1
  );
}

/* ============================================================
   STAFF PERFORMANCE
   ============================================================ */

export type StaffStats = {
  hours30: number;
  entries30: number;
  daysLogged30: number;
  blockers30: number;
  sharedRatio: number;
  milestonesDone: number;
  milestonesLate: number;
};

/**
 * A fair picture of one person's last 30 days, from data they already file.
 *
 * Deliberately not a leaderboard: `daysLogged` matters more than raw hours,
 * because consistency is the thing that actually keeps clients informed.
 */
export async function staffPerformance(employeeId: string): Promise<StaffStats> {
  const db = createAdminClient();
  const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

  const { data: logs } = await db
    .from("daily_work_logs")
    .select("work_date, hours_spent, blockers, client_visible, project_id")
    .eq("employee_id", employeeId)
    .gte("work_date", since);

  const rows = logs ?? [];
  const projectIds = [...new Set(rows.map((l) => l.project_id).filter(Boolean))] as string[];

  const { data: milestones } = projectIds.length
    ? await db.from("milestones")
        .select("is_done, due_date, completed_at").in("project_id", projectIds)
    : { data: [] as any[] };

  const done = (milestones ?? []).filter((m) => m.is_done);

  return {
    hours30: rows.reduce((s, l) => s + Number(l.hours_spent || 0), 0),
    entries30: rows.length,
    daysLogged30: new Set(rows.map((l) => l.work_date)).size,
    blockers30: rows.filter((l) => l.blockers).length,
    sharedRatio: rows.length
      ? Math.round((rows.filter((l) => l.client_visible).length / rows.length) * 100)
      : 0,
    milestonesDone: done.length,
    milestonesLate: done.filter(
      (m) => m.due_date && m.completed_at && m.completed_at.slice(0, 10) > m.due_date
    ).length,
  };
}
