import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { getSiteBaseUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * The daily job.
 *
 * `payment_reminder`, `payment_overdue`, `retainer_renewal` and `domain_expiry`
 * have existed as templates since launch and had never once been sent, because
 * nothing was scheduled to send them. Invoices also never became `overdue`:
 * the only thing that recalculates invoice status is a trigger on `payments`,
 * so an invoice nobody paid stayed `sent` forever.
 *
 * Runs from `vercel.json`. Vercel sends `Authorization: Bearer $CRON_SECRET`;
 * the same secret in the query string works for manual runs.
 */
function authorised(req: Request) {
  const secret = process.env.CRON_SECRET;
  // Refuse rather than run wide open — this endpoint emails clients.
  if (!secret) return false;

  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  return new URL(req.url).searchParams.get("secret") === secret;
}

const today = () => new Date().toISOString().slice(0, 10);
const dayOffset = (n: number) =>
  new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json(
      { error: "Unauthorised. Set CRON_SECRET and send it as a bearer token." },
      { status: 401 }
    );
  }

  const db = createAdminClient();
  const ran: Record<string, number> = {
    marked_overdue: 0, reminders_sent: 0, overdue_sent: 0,
    retainers_billed: 0, deadline_warnings: 0, passwords_purged: 0, errors: 0,
  };

  /* ---------- 1. Mark unpaid invoices overdue ------------------------- */
  try {
    const { data: nowOverdue } = await db
      .from("invoices")
      .select("id")
      .in("status", ["sent", "partial"])
      .lt("due_date", today());

    if (nowOverdue?.length) {
      await db.from("invoices")
        .update({ status: "overdue" })
        .in("id", nowOverdue.map((i) => i.id));
      ran.marked_overdue = nowOverdue.length;
    }
  } catch (e) {
    console.error("cron: overdue sweep failed", e);
    ran.errors++;
  }

  /* ---------- 2. Reminder three days before the due date -------------- */
  try {
    const { data: dueSoon } = await db
      .from("invoices")
      .select("id, invoice_no, total, amount_paid, currency, due_date, project_id, clients(id, name, email)")
      .in("status", ["sent", "partial"])
      .eq("due_date", dayOffset(3));

    for (const inv of dueSoon ?? []) {
      const client = (inv.clients as any) ?? null;
      if (!client?.email) continue;
      const balance = Number(inv.total) - Number(inv.amount_paid);
      if (balance <= 0.01) continue;

      const res = await sendEmail({
        templateKey: "payment_reminder",
        to: client.email,
        clientId: client.id,
        projectId: inv.project_id ?? undefined,
        attach: { type: "invoice", id: inv.id },
        vars: {
          client_name: client.name,
          invoice_no: inv.invoice_no,
          amount: balance.toLocaleString(),
          currency: inv.currency,
          due_date: inv.due_date,
        },
      });
      if (res.ok) ran.reminders_sent++;
    }
  } catch (e) {
    console.error("cron: reminders failed", e);
    ran.errors++;
  }

  /* ---------- 3. Chase the day after it lapsed ------------------------ */
  try {
    const { data: justLate } = await db
      .from("invoices")
      .select("id, invoice_no, total, amount_paid, currency, due_date, project_id, clients(id, name, email), projects(name)")
      .eq("status", "overdue")
      .eq("due_date", dayOffset(-1));

    for (const inv of justLate ?? []) {
      const client = (inv.clients as any) ?? null;
      if (!client?.email) continue;
      const balance = Number(inv.total) - Number(inv.amount_paid);
      if (balance <= 0.01) continue;

      const res = await sendEmail({
        templateKey: "payment_overdue",
        to: client.email,
        clientId: client.id,
        projectId: inv.project_id ?? undefined,
        attach: { type: "invoice", id: inv.id },
        vars: {
          client_name: client.name,
          invoice_no: inv.invoice_no,
          amount: balance.toLocaleString(),
          currency: inv.currency,
          due_date: inv.due_date,
          project_name: (inv.projects as any)?.name ?? "your project",
        },
      });
      if (res.ok) ran.overdue_sent++;
    }
  } catch (e) {
    console.error("cron: overdue chase failed", e);
    ran.errors++;
  }

  /* ---------- 4. Retainers due today ---------------------------------- */
  try {
    const { data: due } = await db
      .from("deals")
      .select("id, deal_no, title, total, currency, client_id, billing_cycle, next_renewal_on, retainer_ends_on, clients(id, name, email)")
      .eq("is_retainer", true)
      .eq("status", "locked")
      .lte("next_renewal_on", today());

    for (const deal of due ?? []) {
      // A retainer that has run its course stops billing rather than looping.
      if (deal.retainer_ends_on && deal.retainer_ends_on < today()) {
        await db.from("deals").update({ next_renewal_on: null }).eq("id", deal.id);
        continue;
      }

      const client = (deal.clients as any) ?? null;
      const amount = Number(deal.total || 0);
      if (!client?.email || amount <= 0) continue;

      const { data: invNo } = await db.rpc("next_invoice_no");
      const periodLabel = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

      const { data: invoice, error: invErr } = await db.from("invoices").insert({
        invoice_no: invNo,
        client_id: deal.client_id,
        deal_id: deal.id,
        line_items: [{ item: `${deal.title} — ${periodLabel}`, qty: 1, price: amount }],
        // `deals.total` is already tax-inclusive, as everywhere else.
        subtotal: amount, tax_percent: 0, total: amount,
        currency: deal.currency,
        due_date: dayOffset(7),
        status: "sent",
        notes: `Retainer — ${deal.billing_cycle ?? "monthly"} · ${periodLabel}`,
      }).select().single();

      if (invErr) {
        console.error("cron: retainer invoice failed for", deal.deal_no, invErr);
        ran.errors++;
        continue;
      }

      await sendEmail({
        templateKey: "retainer_renewal",
        to: client.email,
        clientId: deal.client_id,
        attach: { type: "invoice", id: invoice.id },
        vars: {
          client_name: client.name,
          invoice_no: invoice.invoice_no,
          amount: amount.toLocaleString(),
          currency: deal.currency,
          due_date: invoice.due_date,
          period: periodLabel,
        },
      });

      // Advance the clock only after the invoice exists, so a failure retries
      // tomorrow rather than silently skipping a month's revenue.
      const next = new Date(deal.next_renewal_on || today());
      if (deal.billing_cycle === "yearly") next.setFullYear(next.getFullYear() + 1);
      else if (deal.billing_cycle === "quarterly") next.setMonth(next.getMonth() + 3);
      else next.setMonth(next.getMonth() + 1);

      await db.from("deals")
        .update({ next_renewal_on: next.toISOString().slice(0, 10) })
        .eq("id", deal.id);

      ran.retainers_billed++;
    }
  } catch (e) {
    console.error("cron: retainers failed", e);
    ran.errors++;
  }

  /* ---------- 5. Discard expired password previews --------------------- */
  try {
    // The admin copy of a password is only useful while the login is being
    // handed over. Past that it is a stored credential with no purpose, so it
    // goes — the real password lives in Supabase auth either way.
    const [{ data: c }, { data: e }] = await Promise.all([
      db.from("clients").update({ portal_password_preview: null })
        .lt("password_preview_expires_at", new Date().toISOString())
        .not("portal_password_preview", "is", null).select("id"),
      db.from("employees").update({ portal_password_preview: null })
        .lt("password_preview_expires_at", new Date().toISOString())
        .not("portal_password_preview", "is", null).select("id"),
    ]);
    ran.passwords_purged = (c?.length ?? 0) + (e?.length ?? 0);
  } catch (err) {
    console.error("cron: password purge failed", err);
    ran.errors++;
  }

  /* ---------- 5. Internal deadline warning ---------------------------- */
  try {
    const { data: dueProjects } = await db
      .from("projects")
      .select("id, name, deadline, progress, clients(name)")
      .not("status", "in", "(completed,cancelled,delivered)")
      .gte("deadline", today())
      .lte("deadline", dayOffset(3));

    if (dueProjects?.length) {
      const lines = dueProjects.map(
        (p) => `• ${p.name} (${(p.clients as any)?.name ?? "—"}) — due ${p.deadline}, ${p.progress}% complete`
      );
      const atRisk = dueProjects.filter((p) => Number(p.progress) < 80);

      const res = await sendEmail({
        templateKey: "admin_deadline_warning",
        to: await adminNotifyAddress(),
        vars: {},
        subjectOverride:
          atRisk.length
            ? `⚠️ ${atRisk.length} project${atRisk.length === 1 ? "" : "s"} at risk this week`
            : `📅 ${dueProjects.length} deadline${dueProjects.length === 1 ? "" : "s"} in the next 3 days`,
        bodyOverride:
          `Deadlines falling inside the next three days.\n\n` +
          lines.join("\n") +
          (atRisk.length
            ? `\n\n## Needs attention\n\n` +
              atRisk.map((p) => `• ${p.name} is only ${p.progress}% complete`).join("\n")
            : "") +
          `\n\nOpen the board:\n${getSiteBaseUrl()}/${ADMIN}/projects`,
      });
      if (res.ok) ran.deadline_warnings = dueProjects.length;
    }
  } catch (e) {
    console.error("cron: deadline warnings failed", e);
    ran.errors++;
  }

  return NextResponse.json({ ok: true, ran_at: new Date().toISOString(), ...ran });
}
