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
  "employee.create": "Employee added",
  "employee.update": "Employee details updated",
  "employee.photo": "Profile photo changed",
  "employee.photo_decision": "Photo removal answered",
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
  /** Tasks THIS person completed in the window. */
  tasksDone: number;
  /** Of those, finished after their due date. */
  tasksLate: number;
  /** Still open and already past due. */
  tasksOverdue: number;
  /** Hours the timer recorded, as opposed to hours self-reported. */
  trackedHours30: number;
  /** 1–5, averaged across rated projects. Null when never rated. */
  avgRating: number | null;
  ratedProjects: number;
  /** Kept: the old milestone view is still meaningful on a project page. */
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
  const sinceIso = new Date(Date.now() - 30 * 864e5).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: milestones }, { data: tasks }, { data: entries }, { data: ratings }] =
    await Promise.all([
      projectIds.length
        ? db.from("milestones").select("is_done, due_date, completed_at").in("project_id", projectIds)
        : Promise.resolve({ data: [] as any[] }),

      // Tasks assigned to THIS person. The old code counted every milestone on
      // every project they had logged against, so on a shared project each
      // person was credited with everyone else's work.
      db
        .from("tasks")
        .select("id, status, due_date, done_at")
        .eq("assigned_employee_id", employeeId),

      db
        .from("time_entries")
        .select("duration_sec")
        .eq("employee_id", employeeId)
        .not("ended_at", "is", null)
        .gte("started_at", sinceIso),

      db.from("project_ratings").select("score").eq("employee_id", employeeId),
    ]);

  const done = (milestones ?? []).filter((m) => m.is_done);

  const allTasks = tasks ?? [];
  const doneRecently = allTasks.filter(
    (t: any) => t.status === "done" && t.done_at && t.done_at >= sinceIso
  );
  const scores = (ratings ?? []).map((r: any) => Number(r.score)).filter((n) => n > 0);

  return {
    hours30: rows.reduce((s, l) => s + Number(l.hours_spent || 0), 0),
    entries30: rows.length,
    daysLogged30: new Set(rows.map((l) => l.work_date)).size,
    blockers30: rows.filter((l) => l.blockers).length,
    sharedRatio: rows.length
      ? Math.round((rows.filter((l) => l.client_visible).length / rows.length) * 100)
      : 0,

    tasksDone: doneRecently.length,
    tasksLate: doneRecently.filter(
      (t: any) => t.due_date && t.done_at && t.done_at.slice(0, 10) > t.due_date
    ).length,
    // Counted apart from `tasksLate`, not added to it — a task cannot be both
    // finished late and still outstanding, and double-counting would make the
    // on-time rate meaningless.
    tasksOverdue: allTasks.filter(
      (t: any) => t.status !== "done" && t.due_date && t.due_date < today
    ).length,

    trackedHours30:
      Math.round(
        ((entries ?? []).reduce((s, e: any) => s + Number(e.duration_sec ?? 0), 0) / 3600) * 10
      ) / 10,

    avgRating: scores.length
      ? Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10
      : null,
    ratedProjects: scores.length,

    milestonesDone: done.length,
    milestonesLate: done.filter(
      (m) => m.due_date && m.completed_at && m.completed_at.slice(0, 10) > m.due_date
    ).length,
  };
}

/* ============================================================
   PROJECT RISK
   ============================================================ */

export type RiskReason = { label: string; detail: string };
export type ProjectRisk = {
  id: string;
  name: string;
  clientName: string | null;
  /** Higher is worse. Sum of the reasons' weights. */
  score: number;
  reasons: RiskReason[];
};

/**
 * Which projects are in trouble, and why.
 *
 * Deliberately arithmetic and NOT a language model. A risk flag has to be
 * explainable to the person whose project it is: "62% done with 80% of the time
 * gone, 3 tasks overdue" is something you can argue with and act on. "The model
 * thinks this is risky" is neither.
 *
 * Every signal here is a number the system already records — which also means
 * every flag can be checked.
 */
export async function projectRisk(limit = 8): Promise<ProjectRisk[]> {
  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: projects, error } = await db
    .from("projects")
    .select("id, name, progress, start_date, deadline, estimated_delivery, status, clients(name)")
    .not("status", "in", '("completed","cancelled","delivered")');

  if (error) {
    console.error("projectRisk failed", error);
    return [];
  }

  const ids = (projects ?? []).map((p) => p.id);
  if (!ids.length) return [];

  const [{ data: tasks }, { data: logs }] = await Promise.all([
    db.from("tasks").select("project_id, status, due_date").in("project_id", ids),
    db
      .from("daily_work_logs")
      .select("project_id, work_date, blockers")
      .in("project_id", ids)
      .order("work_date", { ascending: false }),
  ]);

  const out: ProjectRisk[] = [];

  for (const p of projects ?? []) {
    const reasons: RiskReason[] = [];
    let score = 0;

    const progress = Number(p.progress ?? 0);

    // 1. Burning time faster than progress. Only meaningful once a project has
    //    both ends of a range — without them there is nothing to compare.
    if (p.start_date && p.deadline) {
      const start = +new Date(p.start_date);
      const end = +new Date(p.deadline);
      const span = end - start;
      if (span > 0) {
        const elapsed = Math.min(100, Math.max(0, ((Date.now() - start) / span) * 100));
        // 15 points of slack: a project is allowed to be a little behind
        // without being called at-risk every single week.
        if (elapsed - progress > 15) {
          score += Math.round(elapsed - progress);
          reasons.push({
            label: "Behind schedule",
            detail: `${progress}% done with ${Math.round(elapsed)}% of the time gone`,
          });
        }
      }
    }

    // 2. Our own estimate says we will miss the date we agreed.
    if (p.deadline && p.estimated_delivery && p.estimated_delivery > p.deadline) {
      const days = Math.round(
        (+new Date(p.estimated_delivery) - +new Date(p.deadline)) / 864e5
      );
      score += 20;
      reasons.push({
        label: "Estimate past deadline",
        detail: `${days} day${days === 1 ? "" : "s"} beyond the agreed date`,
      });
    }

    // 3. Past the deadline entirely and still open.
    if (p.deadline && p.deadline < today) {
      score += 30;
      reasons.push({ label: "Deadline passed", detail: `Was due ${p.deadline}` });
    }

    // 4. Overdue tasks.
    const overdue = (tasks ?? []).filter(
      (t: any) => t.project_id === p.id && t.status !== "done" && t.due_date && t.due_date < today
    ).length;
    if (overdue > 0) {
      score += overdue * 5;
      reasons.push({
        label: "Overdue tasks",
        detail: `${overdue} task${overdue === 1 ? "" : "s"} past their due date`,
      });
    }

    // 5. Nobody has logged anything. Silence on a live project is its own
    //    signal — it is how a stalled project stays invisible for a month.
    const mine = (logs ?? []).filter((l: any) => l.project_id === p.id);
    const last = mine[0]?.work_date;
    const quietDays = last
      ? Math.round((Date.now() - +new Date(last)) / 864e5)
      : p.start_date
        ? Math.round((Date.now() - +new Date(p.start_date)) / 864e5)
        : 0;
    if (quietDays >= 7) {
      score += Math.min(25, quietDays);
      reasons.push({
        label: "No updates",
        detail: last ? `Nothing logged for ${quietDays} days` : "Nothing logged at all",
      });
    }

    // 6. Blockers raised in the last fortnight and still being repeated.
    const recentBlockers = mine.filter(
      (l: any) => l.blockers && +new Date(l.work_date) > Date.now() - 14 * 864e5
    ).length;
    if (recentBlockers >= 2) {
      score += recentBlockers * 4;
      reasons.push({
        label: "Repeated blockers",
        detail: `Raised on ${recentBlockers} days in the last fortnight`,
      });
    }

    if (reasons.length) {
      out.push({
        id: p.id,
        name: p.name,
        clientName: (p.clients as any)?.name ?? null,
        score,
        reasons,
      });
    }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
