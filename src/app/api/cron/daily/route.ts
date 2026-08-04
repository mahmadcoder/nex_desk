import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { getSiteBaseUrl, money } from "@/lib/utils";
import { expenseCategoryLabel, isCriticalCategory } from "@/config/expenseCategories";
import { notify } from "@/lib/actions/notify";

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
    retainers_billed: 0, deadline_warnings: 0, kickoff_nudges: 0,
    renewal_notices: 0, quote_followups: 0, quotes_cold: 0,
    feedback_chases: 0, testimonial_asks: 0, agency_renewals: 0,
    passwords_purged: 0, errors: 0,
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

  /* ---------- 4b. Chase unticked kickoff items ------------------------- */
  try {
    // Three days after the start date, then at most once a week: enough to
    // keep it moving, not enough to feel nagged.
    const { data: stalled } = await db
      .from("projects")
      .select("id, name, start_date, kickoff_items, kickoff_nudged_at, clients(id, name, email)")
      .in("status", ["not_started", "in_progress"])
      .not("kickoff_items", "is", null)
      .lte("start_date", dayOffset(-3));

    for (const p of stalled ?? []) {
      const items = Array.isArray(p.kickoff_items) ? (p.kickoff_items as any[]) : [];
      const missing = items.filter((i) => !i.done);
      if (!missing.length) continue;

      if (p.kickoff_nudged_at && Date.now() - new Date(p.kickoff_nudged_at).getTime() < 7 * 864e5) {
        continue;
      }

      const client = (p.clients as any) ?? null;
      if (!client?.email) continue;

      const res = await sendEmail({
        templateKey: "kickoff_reminder",
        to: client.email,
        clientId: client.id,
        projectId: p.id,
        vars: {
          client_name: client.name,
          project_name: p.name,
          missing_items: missing.map((i: any) => `• ${i.label}`).join("\n"),
          missing_count: missing.length,
          portal_url: `${getSiteBaseUrl()}/portal`,
        },
      });

      if (res.ok) {
        await db.from("projects")
          .update({ kickoff_nudged_at: new Date().toISOString() })
          .eq("id", p.id);
        ran.kickoff_nudges++;
      }
    }
  } catch (e) {
    console.error("cron: kickoff nudges failed", e);
    ran.errors++;
  }

  /* ---------- 4c. Renewals coming due ---------------------------------- */
  try {
    // Exactly 30, 14 and 3 days out. Three warnings is enough to act on and
    // few enough not to be ignored; matching on the date itself means no
    // throttle state to get wrong.
    const windows = [30, 14, 3];
    const dates = windows.map(dayOffset);

    const { data: dueRenewals, error: renewErr } = await db
      .from("project_expenses")
      .select("id, label, category, currency, cost, bill_amount, renews_on, client_id, project_id, clients(id, name, email)")
      .in("renews_on", dates);

    // 42P01 = the table is not there yet. Say so once rather than failing
    // silently for weeks until someone notices the emails never arrive.
    if (renewErr) {
      console.error(
        renewErr.code === "42P01"
          ? "cron: project_expenses missing — run supabase/idempotent_fixes_2027_06.sql"
          : "cron: renewal sweep failed",
        renewErr
      );
      ran.errors++;
    }

    const upcoming: string[] = [];

    for (const x of dueRenewals ?? []) {
      const client = (x.clients as any) ?? null;
      const daysLeft = Math.round(
        (new Date(x.renews_on!).getTime() - Date.now()) / 864e5
      );
      upcoming.push(
        `• ${x.label} (${client?.name ?? "—"}) — renews ${x.renews_on}, in ${daysLeft} days`
      );

      if (!client?.email) continue;

      // The existing domain_expiry copy is written about a site going offline,
      // which is true of a domain or hosting account and misleading about a
      // plugin licence. Everything else gets the neutral wording.
      const isInfrastructure = x.category === "domain" || x.category === "hosting";

      const res = await sendEmail({
        templateKey: isInfrastructure ? "domain_expiry" : "expense_renewal",
        to: client.email,
        clientId: client.id,
        projectId: x.project_id ?? undefined,
        vars: {
          client_name: client.name,
          category: expenseCategoryLabel(x.category),
          item: x.label,
          due_date: x.renews_on!,
          amount: money(Number(x.bill_amount || x.cost || 0), x.currency),
          consequence_line: isCriticalCategory(x.category)
            ? "If this lapses it stops working immediately, and getting it back is slower and more expensive than renewing it."
            : "If this lapses, whatever it powers stops working until it is renewed.",
        },
      });

      if (res.ok) {
        await db.from("project_expenses")
          .update({ renewal_notified_at: new Date().toISOString() })
          .eq("id", x.id);
        ran.renewal_notices++;
      }
    }

    if (upcoming.length) {
      await sendEmail({
        templateKey: "admin_renewals_due",
        to: await adminNotifyAddress(),
        vars: {
          count: upcoming.length,
          items: upcoming.join("\n"),
          admin_url: `${getSiteBaseUrl()}/${ADMIN}/clients`,
        },
      });
    }
  } catch (e) {
    console.error("cron: renewals failed", e);
    ran.errors++;
  }

  /* ---------- 4d. Chase open quotes ------------------------------------ */
  try {
    // Day 3, then 7, then 14. Three chases over a fortnight is enough to get
    // an answer and few enough that the answer is not "stop emailing me".
    // After that the deal goes into the admin digest instead of being chased
    // further — and it is never auto-cancelled, because deciding a quote is
    // dead is a judgement call, not a timer.
    const FOLLOWUP_DAYS = [3, 7, 14];

    const { data: openQuotes, error: quoteErr } = await db
      .from("deals")
      .select("id, deal_no, title, total, currency, quote_sent_at, followup_count, last_followup_at, client_id, clients(id, name, email)")
      .eq("status", "sent")
      .not("quote_sent_at", "is", null);

    // 42703 = the quote columns are not there yet. Say so once, rather than
    // failing quietly for weeks until someone notices no chase ever went out.
    if (quoteErr) {
      console.error(
        quoteErr.code === "42703"
          ? "cron: deals.quote_sent_at missing — run supabase/idempotent_fixes_2027_07.sql"
          : "cron: quote sweep failed",
        quoteErr
      );
      ran.errors++;
    }

    const cold: string[] = [];

    for (const q of openQuotes ?? []) {
      const daysSince = Math.floor(
        (Date.now() - new Date(q.quote_sent_at!).getTime()) / 864e5
      );
      const done = Number(q.followup_count ?? 0);

      // Out of chases: report it once it has also been quiet for a week, then
      // leave it alone.
      if (done >= FOLLOWUP_DAYS.length) {
        if (daysSince >= FOLLOWUP_DAYS[FOLLOWUP_DAYS.length - 1] + 7) {
          cold.push(
            `• ${q.deal_no} — ${q.title} (${(q.clients as any)?.name ?? "—"}), ` +
            `${money(Number(q.total), q.currency)}, quoted ${daysSince} days ago, ${done} chases, no answer`
          );
        }
        continue;
      }

      if (daysSince < FOLLOWUP_DAYS[done]) continue;

      // Hard floor regardless of the cadence: after a cron outage the backlog
      // must not fire two chases at the same client on the same morning.
      if (q.last_followup_at && Date.now() - new Date(q.last_followup_at).getTime() < 2 * 864e5) {
        continue;
      }

      const client = (q.clients as any) ?? null;
      if (!client?.email) continue;

      // No attachment, on purpose. `sendEmail({ attach })` regenerates the PDF
      // and writes a fresh `documents` row on every call, so chasing three
      // times would put three identical quotations in the client's portal.
      const res = await sendEmail({
        templateKey: "quotation_followup",
        to: client.email,
        clientId: q.client_id,
        vars: {
          client_name: client.name,
          project_name: q.title,
          deal_no: q.deal_no,
          amount: money(Number(q.total), q.currency),
          currency: q.currency,
          days_since: daysSince,
        },
      });

      if (res.ok) {
        await db.from("deals")
          .update({ followup_count: done + 1, last_followup_at: new Date().toISOString() })
          .eq("id", q.id);
        ran.quote_followups++;
      }
    }

    if (cold.length) {
      ran.quotes_cold = cold.length;
      await sendEmail({
        templateKey: "admin_quotes_cold",
        to: await adminNotifyAddress(),
        vars: {},
        subjectOverride: `${cold.length} quote${cold.length === 1 ? " has" : "s have"} gone cold`,
        bodyOverride:
          `These were quoted, chased three times and never answered. Close them out or pick up the phone — ` +
          `a quote with no decision is worse than a no.\n\n` +
          cold.join("\n") +
          `\n\nOpen the pipeline:\n${getSiteBaseUrl()}/${ADMIN}/deals?status=sent`,
      });
    }
  } catch (e) {
    console.error("cron: quote follow-ups failed", e);
    ran.errors++;
  }

  /* ---------- 4e. Chase silent reviews --------------------------------- */
  try {
    // A staging link was shared and nothing came back. Chased from day 3, then
    // weekly, three times, then left alone — past that it is a phone call, not
    // another email.
    const { data: awaiting, error: reviewErr } = await db
      .from("projects")
      .select("id, name, deadline, staging_url, staging_shared_at, feedback_nudged_at, feedback_nudge_count, status, client_id, clients(id, name, email)")
      .not("staging_shared_at", "is", null)
      .in("status", ["in_progress", "review"])
      .lt("feedback_nudge_count", 3);

    if (reviewErr) {
      console.error(
        reviewErr.code === "42703"
          ? "cron: projects.staging_shared_at missing — run supabase/idempotent_fixes_2027_08.sql"
          : "cron: review sweep failed",
        reviewErr
      );
      ran.errors++;
    }

    const candidates = (awaiting ?? []).filter((p) => {
      const shared = new Date(p.staging_shared_at!).getTime();
      if (Date.now() - shared < 3 * 864e5) return false;
      if (p.feedback_nudged_at && Date.now() - new Date(p.feedback_nudged_at).getTime() < 7 * 864e5) {
        return false;
      }
      return !!(p.clients as any)?.email;
    });

    if (candidates.length) {
      const ids = candidates.map((p) => p.id);

      // What counts as the client having answered — real actions of theirs,
      // not a guess. Chasing someone who already replied through the portal is
      // the fastest way to make these emails get filtered.
      const [{ data: requests }, { data: approvals }] = await Promise.all([
        db.from("change_requests").select("project_id, created_at").in("project_id", ids),
        db.from("milestones").select("project_id, approved_at").in("project_id", ids).not("approved_at", "is", null),
      ]);

      for (const p of candidates) {
        const shared = new Date(p.staging_shared_at!).getTime();

        const responded =
          (requests ?? []).some(
            (r) => r.project_id === p.id && new Date(r.created_at).getTime() > shared
          ) ||
          (approvals ?? []).some(
            (m) => m.project_id === p.id && new Date(m.approved_at!).getTime() > shared
          );

        if (responded) continue;

        const client = (p.clients as any)!;
        const res = await sendEmail({
          templateKey: "feedback_needed",
          to: client.email,
          clientId: p.client_id,
          projectId: p.id,
          vars: {
            client_name: client.name,
            project_name: p.name,
            staging_url: p.staging_url ?? "",
            deadline: p.deadline ?? "the agreed date",
            days_waiting: Math.floor((Date.now() - shared) / 864e5),
          },
        });

        if (res.ok) {
          await db.from("projects").update({
            feedback_nudged_at: new Date().toISOString(),
            feedback_nudge_count: Number(p.feedback_nudge_count ?? 0) + 1,
          }).eq("id", p.id);
          ran.feedback_chases++;
        }
      }
    }
  } catch (e) {
    console.error("cron: review chases failed", e);
    ran.errors++;
  }

  /* ---------- 4f. Ask for a testimonial -------------------------------- */
  try {
    // Fourteen days after handover: long enough that they have actually lived
    // with the thing, soon enough that it is still fresh. Asked once, ever.
    const { data: settled, error: tErr } = await db
      .from("projects")
      .select("id, name, handed_over_at, client_id, clients(id, name, email)")
      .not("handed_over_at", "is", null)
      .is("testimonial_requested_at", null)
      .lte("handed_over_at", new Date(Date.now() - 14 * 864e5).toISOString());

    if (tErr) {
      console.error(
        tErr.code === "42703"
          ? "cron: projects.testimonial_requested_at missing — run supabase/idempotent_fixes_2027_08.sql"
          : "cron: testimonial sweep failed",
        tErr
      );
      ran.errors++;
    }

    if (settled?.length) {
      // Somebody who already wrote one should not be asked again.
      const { data: existing } = await db
        .from("testimonials")
        .select("project_id")
        .in("project_id", settled.map((p) => p.id));
      const alreadyGave = new Set((existing ?? []).map((t) => t.project_id));

      for (const p of settled) {
        const client = (p.clients as any) ?? null;

        // Stamp regardless of whether it sends, so a client with no email —
        // or one who already left a testimonial — is not re-examined daily
        // forever.
        const skip = alreadyGave.has(p.id) || !client?.email;

        if (!skip) {
          const res = await sendEmail({
            templateKey: "testimonial_request",
            to: client.email,
            clientId: p.client_id,
            projectId: p.id,
            vars: {
              client_name: client.name,
              project_name: p.name,
              portal_url: `${getSiteBaseUrl()}/portal`,
            },
          });
          if (res.ok) ran.testimonial_asks++;
        }

        await db.from("projects")
          .update({ testimonial_requested_at: new Date().toISOString() })
          .eq("id", p.id);
      }
    }
  } catch (e) {
    console.error("cron: testimonial asks failed", e);
    ran.errors++;
  }

  /* ---------- 4g. Our own subscriptions coming up for renewal ---------- */
  try {
    // Same 30/14/3 cadence as client domains, but pointed at ourselves. A
    // subscription that renews silently is a decision nobody got to make.
    const windows = [30, 14, 3].map(dayOffset);

    const { data: dueTools, error: toolErr } = await db
      .from("agency_expenses")
      .select("id, label, vendor, category, amount, currency, renews_on")
      .in("renews_on", windows);

    if (toolErr) {
      console.error(
        toolErr.code === "42P01"
          ? "cron: agency_expenses missing — run supabase/idempotent_fixes_2027_14.sql"
          : "cron: agency renewal sweep failed",
        toolErr
      );
      ran.errors++;
    }

    if (dueTools?.length) {
      const lines = dueTools.map((t) => {
        const days = Math.round((new Date(t.renews_on!).getTime() - Date.now()) / 864e5);
        return `• ${t.label}${t.vendor ? ` (${t.vendor})` : ""} — ${money(Number(t.amount), t.currency)} on ${t.renews_on}, in ${days} days`;
      });

      const res = await sendEmail({
        templateKey: "admin_agency_renewals",
        to: await adminNotifyAddress(),
        vars: {},
        subjectOverride:
          `${dueTools.length} agency subscription${dueTools.length === 1 ? "" : "s"} renewing soon`,
        bodyOverride:
          `These charge your card automatically unless you cancel first.\n\n` +
          lines.join("\n") +
          `\n\nCancel anything you are no longer using — an unused seat renews just as reliably as a used one.\n\n` +
          `Open the ledger:\n${getSiteBaseUrl()}/${ADMIN}/expenses`,
      });

      if (res.ok) {
        await db.from("agency_expenses")
          .update({ renewal_notified_at: new Date().toISOString() })
          .in("id", dueTools.map((t) => t.id));
        ran.agency_renewals = dueTools.length;
      }

      // In-app as well, so it is waiting in the panel rather than only in an
      // inbox that may not be checked before the card is charged.
      await notify({
        kind: "expense.renewal",
        title: `${dueTools.length} subscription${dueTools.length === 1 ? "" : "s"} renewing soon`,
        body: dueTools.map((t) => t.label).join(", "),
        href: `/${ADMIN}/expenses`,
        entity: "agency_expenses",
        actorKind: "system",
      });
    }
  } catch (e) {
    console.error("cron: agency renewals failed", e);
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
