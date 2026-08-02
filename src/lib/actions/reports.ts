"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { sendEmail } from "@/lib/email/send";
import { aiComplete } from "@/lib/ai";
import { describeMetrics } from "@/config/logFields";
import { asUuid, getSiteBaseUrl, money } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The AI monthly client report.
 *
 * A retainer client's biggest doubt is "what am I actually paying for each
 * month?" — and the answer already exists in the daily work logs, the
 * per-service metrics and the milestone history. This gathers the last 30
 * days of all of it and has the AI write the summary a client actually reads.
 *
 * Deliberately a DRAFT: the admin sees it, edits it, and presses send. The AI
 * writes the first version; a human signs it.
 */
export async function draftMonthlyReport(
  clientId: string
): Promise<{ ok: boolean; error?: string; subject?: string; body?: string; stats?: any }> {
  await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(clientId);
  if (!id) return { ok: false, error: "Invalid client reference." };

  const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const monthLabel = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const [{ data: client }, { data: projects }] = await Promise.all([
    db.from("clients").select("id, name, company").eq("id", id).maybeSingle(),
    db.from("projects").select("id, name, progress, status, deadline").eq("client_id", id),
  ]);
  if (!client) return { ok: false, error: "Client not found." };

  const projectIds = (projects ?? []).map((p) => p.id);
  if (!projectIds.length) {
    return { ok: false, error: "This client has no projects to report on." };
  }

  const [{ data: logs }, { data: milestones }, { data: payments }] = await Promise.all([
    db.from("daily_work_logs")
      .select("work_date, hours_spent, tasks_completed, metrics, project_id, client_visible")
      .in("project_id", projectIds)
      .gte("work_date", since)
      .order("work_date"),
    db.from("milestones")
      .select("title, is_done, completed_at, project_id")
      .in("project_id", projectIds),
    db.from("payments")
      .select("amount, currency, paid_on")
      .eq("client_id", id)
      .gte("paid_on", since),
  ]);

  // Only shared entries feed the report — internal notes stay internal, same
  // rule as the portal timeline.
  const shared = (logs ?? []).filter((l) => l.client_visible);
  if (!shared.length) {
    return {
      ok: false,
      error:
        "No client-shared work logs in the last 30 days. The report is built from " +
        "shared logs — there is nothing to summarise yet.",
    };
  }

  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));
  const totalHours = shared.reduce((s, l) => s + Number(l.hours_spent || 0), 0);
  const doneThisMonth = (milestones ?? []).filter(
    (m) => m.is_done && m.completed_at && m.completed_at.slice(0, 10) >= since
  );

  // Aggregate the per-service metrics into human lines the AI can use.
  const metricLines: string[] = [];
  for (const l of shared) {
    for (const m of describeMetrics(l.metrics as any)) {
      metricLines.push(`${m.label}: ${m.value}`);
    }
  }

  const workLines = shared
    .map((l) => {
      const p = projectById.get(l.project_id);
      return `${l.work_date} · ${p?.name ?? "Project"} · ${Number(l.hours_spent || 0)}h — ${String(
        l.tasks_completed
      ).slice(0, 220)}`;
    })
    .slice(-60) // the freshest 60 entries keep the prompt inside sane limits
    .join("\n");

  const prompt =
    `You are writing the monthly progress report email a software agency (Nex Desk) sends a client. ` +
    `Plain, confident English; short sentences; no buzzwords, no exclamation marks, no emoji. ` +
    `Structure it with these markdown-style section headings on their own lines: "## What we did", ` +
    `"## Results", "## Where each project stands", "## Coming up". Use "• " bullet lines inside sections. ` +
    `Facts only — every claim must come from the data below; invent nothing and round nothing up. ` +
    `Under 250 words. Output ONLY the email body, starting after the greeting "Hi ${client.name.split(" ")[0]},".\n\n` +
    `Client: ${client.name}${client.company ? ` (${client.company})` : ""}\n` +
    `Period: last 30 days (${monthLabel} report)\n` +
    `Total hours worked: ${totalHours.toFixed(1)}\n` +
    `Projects: ${(projects ?? []).map((p) => `${p.name} — ${p.progress}% (${p.status})`).join("; ")}\n` +
    `Milestones completed this period: ${doneThisMonth.map((m) => m.title).join("; ") || "none"}\n` +
    (metricLines.length ? `Measured results: ${metricLines.slice(0, 30).join("; ")}\n` : "") +
    `\nWork log entries:\n${workLines}`;

  const result = await aiComplete(prompt);
  if (!result.ok) return { ok: false, error: result.error };

  const body =
    `Hi ${client.name.split(" ")[0]},\n\n` +
    `Here is your ${monthLabel} report — everything that happened on your account in the last 30 days.\n\n` +
    result.text.trim() +
    `\n\nEvery entry below is also on your portal timeline, with the full history:\n${getSiteBaseUrl()}/portal\n\n` +
    `Questions about any of it — just reply.\n\nBest regards,\nNex Desk`;

  return {
    ok: true,
    subject: `📊 Your ${monthLabel} report — ${totalHours.toFixed(0)} hours across ${projectIds.length} project${projectIds.length === 1 ? "" : "s"}`,
    body,
    stats: {
      hours: totalHours,
      entries: shared.length,
      milestonesDone: doneThisMonth.length,
      paid: (payments ?? []).map((p) => money(Number(p.amount), p.currency)).join(", ") || null,
    },
  };
}

/** Sends the (possibly edited) draft. Separate from drafting so a human signs off. */
export async function sendMonthlyReport(
  clientId: string,
  subject: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(clientId);
  if (!id) return { ok: false, error: "Invalid client reference." };
  if (!subject.trim() || !body.trim()) return { ok: false, error: "Subject and body are both required." };

  const { data: client } = await db.from("clients").select("id, name, email").eq("id", id).maybeSingle();
  if (!client?.email) return { ok: false, error: "This client has no email address on file." };

  const res = await sendEmail({
    templateKey: "client_monthly_report",
    to: client.email,
    clientId: id,
    actorId: me.userId,
    subjectOverride: subject,
    bodyOverride: body,
    vars: {},
  });

  if (res.ok) {
    await recordAudit(me.userId, "client.monthly_report", "clients", id, { subject });
    revalidatePath(`/${ADMIN}/clients/${id}`);
  }
  return { ok: res.ok, error: res.ok ? undefined : res.error };
}
