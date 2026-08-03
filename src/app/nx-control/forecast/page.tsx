import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Stat, Empty } from "@/components/admin/ui";
import { money } from "@/lib/utils";
import {
  buildForecast, expectedStageDate, retainerOccurrences, daysAway,
  type ForecastLine,
} from "@/lib/forecast";
import { AlertTriangle, CircleDollarSign, CalendarClock, HelpCircle } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "Cash flow" };
export const dynamic = "force-dynamic";

const WINDOW_DAYS = 45;

const TIER_STYLE: Record<string, string> = {
  committed: "border-l-2 border-lime-400/60",
  scheduled: "border-l-2 border-ink-400",
  possible: "border-l-2 border-dashed border-bone-600",
};

const TIER_LABEL: Record<string, string> = {
  committed: "Invoiced",
  scheduled: "Scheduled",
  possible: "Not invoiced yet",
};

/**
 * What is expected to come in over the next 45 days.
 *
 * Deliberately 45 and not 90: on seven-day invoice terms, days 61–90 are
 * retainer arithmetic anyone can do in their head, and padding the page with
 * them makes the near term harder to read.
 */
export default async function ForecastPage() {
  const me = await getCurrentStaff();
  // Same guard as Profitability — this is the whole commercial position.
  if (!me?.isPrivileged) return null;

  const db = createAdminClient();

  const [{ data: invoices }, { data: retainers }, { data: expenses }, { data: milestones }, { data: projects }] =
    await Promise.all([
      db.from("invoices")
        .select("id, invoice_no, total, amount_paid, currency, status, issue_date, due_date, stage_index, project_id, deal_id, clients(id, name)")
        .not("status", "in", "(paid,void)"),
      db.from("deals")
        .select("id, deal_no, title, total, currency, billing_cycle, next_renewal_on, retainer_ends_on, client_id, clients(id, name)")
        .eq("is_retainer", true)
        .eq("status", "locked")
        .not("next_renewal_on", "is", null),
      db.from("project_expenses")
        .select("id, label, bill_amount, currency, client_id, clients(id, name)")
        .eq("status", "unbilled")
        .gt("bill_amount", 0),
      db.from("milestones").select("project_id, sort_order, due_date"),
      db.from("projects").select("id, name, deadline, deal_id, deals(deadline)"),
    ]);

  const projectById = new Map((projects ?? []).map((p: any) => [p.id, p]));
  const lines: ForecastLine[] = [];

  /* ---------- Committed: already invoiced, not yet paid ---------------- */
  for (const inv of invoices ?? []) {
    if (inv.status === "draft") continue;

    // What is still owed, not the face value — a part-paid invoice must not
    // forecast money that has already arrived.
    const owed = Number(inv.total) - Number(inv.amount_paid);
    if (!(owed > 0.009)) continue;

    const when = inv.due_date ?? inv.issue_date;
    lines.push({
      currency: inv.currency,
      amount: owed,
      tier: "committed",
      expectedOn: when,
      overdue: !!when && daysAway(when) < 0,
      label: `${inv.invoice_no} — ${(inv.clients as any)?.name ?? "—"}`,
      sublabel: inv.status === "partial" ? "Part paid" : undefined,
      href: `${BASE}/invoices`,
      source: "invoice",
    });
  }

  /* ---------- Scheduled: payment stages not yet issued ----------------- */
  let undatedStages = 0;
  for (const inv of invoices ?? []) {
    if (inv.status !== "draft") continue;
    const amount = Number(inv.total);
    if (!(amount > 0.009)) continue;

    const project = inv.project_id ? projectById.get(inv.project_id) : null;
    const when = expectedStageDate(inv, milestones ?? [], project, (project as any)?.deals ?? null);
    if (!when) undatedStages++;

    lines.push({
      currency: inv.currency,
      amount,
      tier: "scheduled",
      expectedOn: when,
      label: `${(inv.clients as any)?.name ?? "—"} — payment stage`,
      sublabel: (project as any)?.name ?? undefined,
      href: `${BASE}/invoices`,
      source: "stage",
    });
  }

  /* ---------- Scheduled: retainer renewals ----------------------------- */
  for (const deal of retainers ?? []) {
    const amount = Number(deal.total);
    if (!(amount > 0.009)) continue;

    for (const when of retainerOccurrences(deal, WINDOW_DAYS)) {
      lines.push({
        currency: deal.currency,
        amount,
        tier: "scheduled",
        expectedOn: when,
        label: `${(deal.clients as any)?.name ?? "—"} — ${deal.billing_cycle ?? "monthly"} retainer`,
        sublabel: deal.title,
        href: `${BASE}/clients/${deal.client_id}`,
        source: "retainer",
      });
    }
  }

  /* ---------- Possible: recorded costs nobody has billed yet ----------- */
  for (const x of expenses ?? []) {
    lines.push({
      currency: x.currency,
      amount: Number(x.bill_amount),
      tier: "possible",
      // There is no due date, and inventing one would be a lie. It arrives
      // when somebody raises the invoice, which makes this a prompt as much
      // as a forecast.
      expectedOn: null,
      label: `${(x.clients as any)?.name ?? "—"} — ${x.label}`,
      sublabel: "Paid on their behalf, not yet billed",
      href: `${BASE}/clients/${x.client_id}`,
      source: "expense",
    });
  }

  const forecast = buildForecast(lines, WINDOW_DAYS);

  const totalOverdue = forecast.map((f) => ({ currency: f.currency, total: f.overdue })).filter((t) => t.total > 0.009);
  const totalDated = forecast.map((f) => ({ currency: f.currency, total: f.dated })).filter((t) => t.total > 0.009);
  const totalUndated = forecast.map((f) => ({ currency: f.currency, total: f.undated })).filter((t) => t.total > 0.009);

  const joined = (rows: { currency: string; total: number }[]) =>
    rows.length ? rows.map((t) => money(t.total, t.currency)).join(" · ") : "—";

  return (
    <>
      <PageHead
        title="Cash flow"
        sub={`What is expected to arrive over the next ${WINDOW_DAYS} days, from invoices, payment stages and retainers you already hold.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Overdue right now"
          value={joined(totalOverdue)}
          hint="Invoiced, past its due date, still unpaid"
          tone={totalOverdue.length ? "warn" : "default"}
        />
        <Stat
          label={`Expected in ${WINDOW_DAYS} days`}
          value={joined(totalDated)}
          hint="Everything with a date on it, overdue included"
          tone="good"
        />
        <Stat
          label="No date yet"
          value={joined(totalUndated)}
          hint="Real money, but nothing says when"
        />
      </div>

      {!forecast.length ? (
        <div className="mt-8">
          <Empty
            title="Nothing is due to come in"
            body="Every invoice is settled and no retainer renewal falls inside the window. This page fills itself in from invoices, payment stages and retainers — nothing to maintain."
            href={`${BASE}/invoices`}
            cta="Open invoices"
          />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {forecast.map((f) => (
            <section key={f.currency} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-600 bg-ink-700/30 px-5 py-3.5">
                <h2 className="flex items-center gap-2 text-base">
                  <CircleDollarSign size={15} className="text-lime-400" /> {f.currency}
                </h2>
                <p className="font-mono text-sm text-bone-100">
                  {money(f.total, f.currency)}
                  <span className="ml-2 text-[11px] text-bone-400">expected in total</span>
                </p>
              </div>

              <div className="divide-y divide-ink-700">
                {f.buckets.map((b) => (
                  <div key={b.key} className="px-5 py-4">
                    <div className="mb-2.5 flex items-baseline justify-between gap-3">
                      <p
                        className={`mono-tag text-[11px] ${
                          b.key === "overdue"
                            ? "text-rose-300"
                            : b.key === "undated"
                              ? "text-bone-400"
                              : "text-lime-300"
                        }`}
                      >
                        {b.key === "overdue" && <AlertTriangle size={11} className="mr-1 inline" />}
                        {b.key === "undated" && <HelpCircle size={11} className="mr-1 inline" />}
                        {b.label}
                      </p>
                      <p className="font-mono text-xs text-bone-100">{money(b.total, f.currency)}</p>
                    </div>

                    <ul className="space-y-1.5">
                      {b.lines.map((l, i) => (
                        <li
                          key={`${l.source}-${i}`}
                          className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 pl-3 ${TIER_STYLE[l.tier]}`}
                        >
                          <div className="min-w-0">
                            <Link
                              href={l.href ?? "#"}
                              className="text-sm text-bone-200 hover:text-lime-400"
                            >
                              {l.label}
                            </Link>
                            <span className="ml-2 text-[10px] text-bone-500">
                              {TIER_LABEL[l.tier]}
                            </span>
                            {l.sublabel && (
                              <span className="block text-[11px] text-bone-400">{l.sublabel}</span>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="font-mono text-xs text-bone-100">
                              {money(l.amount, f.currency)}
                            </span>
                            {l.expectedOn && (
                              <span className="block text-[10px] text-bone-500">
                                {l.expectedOn}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-2 text-[11px] leading-relaxed text-bone-300">
        <p className="flex items-start gap-2">
          <CalendarClock size={13} className="mt-0.5 shrink-0 text-bone-400" />
          <span>
            Currencies are listed separately and never added together — converting them would
            hide the exchange exposure this page exists to show. <strong>Invoiced</strong> is real
            money already billed. <strong>Scheduled</strong> is a payment stage or retainer that
            has not been issued yet. <strong>Not invoiced yet</strong> is a cost you have paid on
            a client&rsquo;s behalf that nobody has billed — it arrives only when you raise it.
          </span>
        </p>

        {/* The one thing that would otherwise make this page quietly wrong. */}
        {undatedStages > 0 && (
          <p className="flex items-start gap-2 text-amber-300/90">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              {undatedStages} payment stage{undatedStages === 1 ? "" : "s"} could not be dated,
              so {undatedStages === 1 ? "it is" : "they are"} sitting under &ldquo;No date
              yet&rdquo; rather than on the timeline. Put due dates on the payment schedule when
              you lock a deal, or dates on the milestones that release each stage, and they will
              appear in the right week.
            </span>
          </p>
        )}
      </div>
    </>
  );
}
