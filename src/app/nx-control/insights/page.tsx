import { cookies } from "next/headers";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Stat } from "@/components/admin/ui";
import { PlatformIcon } from "@/components/brand/PlatformIcons";
import RangePicker from "@/components/admin/RangePicker";
import { CategoryBars, MonthlyBars, MonthlyMoney } from "@/components/admin/charts/Charts";
import { seriesColour } from "@/components/admin/charts/palette";
import { clientsBySource, overTime, deliveryStats, pipelineInRange } from "@/lib/analytics";
import { SOURCE_SHORT } from "@/config/platforms";
import { asDate, isPreset, monthShort, rangeFor, rangeLabel, type Range } from "@/lib/dates";
import { moneyMulti } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  // The sidebar hides this from staff, but hiding a link is not access control.
  const me = await getCurrentStaff();
  if (!me?.isPrivileged) return null;

  const { range: rawRange, from: rawFrom, to: rawTo } = await searchParams;
  const jar = await cookies();

  // An explicit custom range wins, then a named preset from the URL, then
  // whatever the cookie last remembered, then this month. Same precedence as
  // the dashboard's currency tabs — the URL is shareable, the cookie is sticky.
  const customFrom = asDate(rawFrom);
  const customTo = asDate(rawTo);

  let preset: string | null = null;
  let range: Range;

  if (customFrom && customTo && customFrom <= customTo) {
    range = { from: customFrom, to: customTo };
  } else {
    const remembered = jar.get("nx_insights_range")?.value;
    const key = isPreset(rawRange) ? rawRange : isPreset(remembered) ? remembered : "month";
    preset = key;
    range = rangeFor(key);
  }

  const [sources, timeline, delivery, pipeline] = await Promise.all([
    clientsBySource(range),
    overTime(range),
    deliveryStats(range),
    pipelineInRange(range),
  ]);

  const newClients = timeline.months.reduce((s, m) => s + m.clients, 0);
  const collected = timeline.currencies.map((cur) => ({
    currency: cur,
    total: timeline.months.reduce((s, m) => s + (m.revenue[cur] ?? 0), 0),
  }));

  const shortLabel = (key: string, label: string) => SOURCE_SHORT[key] ?? label;

  // One colour per source, fixed by position in the sorted list and never
  // recomputed per chart — so a source keeps its colour across both panels.
  const sourceColour = new Map(sources.map((s, i) => [s.key, i]));

  const topCurrency = collected[0]?.currency;

  return (
    <>
      <PageHead
        title="Insights"
        sub={`Where the work comes from and what happened. ${rangeLabel(range)}.`}
      />

      <RangePicker preset={preset} from={range.from} to={range.to} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat label="New clients" value={String(newClients)} tone={newClients ? "good" : "default"} />
        <Stat label="Collected" value={moneyMulti(collected, "—")} tone="good" />
        <Stat label="Delivered" value={String(delivery.delivered)} />
        <Stat
          label="On time"
          value={delivery.onTimeRate === null ? "—" : `${delivery.onTimeRate}%`}
          hint={
            delivery.onTimeRate === null
              ? "Needs 3 projects with a deadline"
              : `${delivery.onTime} on time · ${delivery.late} late`
          }
          tone={delivery.onTimeRate !== null && delivery.onTimeRate < 60 ? "warn" : "default"}
        />
      </div>

      {/* ── Where clients come from ─────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-base">Where clients come from</h2>
        <p className="mt-1 mb-3 text-xs leading-relaxed text-bone-300">
          Count and money side by side on purpose. Five clients at $200 look better than one at
          $5,000 until you put the revenue next to them.
        </p>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="card p-5">
            <p className="mono-tag mb-3 text-[11px]">Clients won ({newClients})</p>
            <CategoryBars
              data={sources
                .filter((s) => s.clients > 0)
                .map((s) => ({
                  label: shortLabel(s.key, s.label),
                  value: s.clients,
                  colourIndex: sourceColour.get(s.key) ?? 0,
                }))}
            />
          </div>

          <div className="card p-5">
            <p className="mono-tag mb-3 text-[11px]">
              Collected{topCurrency ? ` (${topCurrency})` : ""}
            </p>
            {/* One currency per chart — bars of different currencies on one
                axis would compare numbers that are not comparable. */}
            <CategoryBars
              currency={topCurrency}
              data={sources
                .map((s) => ({
                  label: shortLabel(s.key, s.label),
                  value: s.revenue.find((r) => r.currency === topCurrency)?.total ?? 0,
                  colourIndex: sourceColour.get(s.key) ?? 0,
                }))
                .filter((d) => d.value > 0)}
            />
          </div>
        </div>

        {/* The table carries every currency, which the chart above cannot. */}
        {!!sources.length && (
          <div className="card mt-4 overflow-hidden">
            <ul className="divide-y divide-ink-700">
              {sources.map((s) => (
                <li
                  key={s.key}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: seriesColour(sourceColour.get(s.key) ?? 0) }}
                    />
                    <PlatformIcon id={s.key} className="h-4 w-4 shrink-0" />
                    <span className="truncate text-sm text-bone-100">
                      {shortLabel(s.key, s.label)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-4 text-xs">
                    <span className="text-bone-300">
                      {s.clients} client{s.clients === 1 ? "" : "s"}
                    </span>
                    <span className="font-mono text-bone-100">{moneyMulti(s.revenue, "—")}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Over time ───────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-base">Over time</h2>
        <p className="mt-1 mb-3 text-xs leading-relaxed text-bone-300">
          Two charts rather than one with two scales. Money is grouped per currency and never
          added together, and things bought on a client&rsquo;s behalf are left out — those live on
          Purchases.
        </p>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="card p-5">
            <p className="mono-tag mb-3 text-[11px]">Cash collected</p>
            <MonthlyMoney
              currencies={timeline.currencies}
              data={timeline.months.map((m) => ({
                month: monthShort(m.month),
                ...m.revenue,
              }))}
            />
          </div>

          <div className="card p-5">
            <p className="mono-tag mb-3 text-[11px]">New clients</p>
            <MonthlyBars
              label="Clients"
              data={timeline.months.map((m) => ({
                month: monthShort(m.month),
                value: m.clients,
              }))}
            />
          </div>
        </div>
      </section>

      {/* ── Delivery ────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-base">Delivery</h2>
        <p className="mt-1 mb-3 text-xs leading-relaxed text-bone-300">
          Measured from the start date to the day the handover pack went out, against the deadline
          on the project. The middle figure is the median — one project that dragged for months
          would pull an average with it and describe nothing typical.
        </p>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="card p-5">
            <p className="mono-tag mb-3 text-[11px]">Handed over</p>
            <MonthlyBars
              label="Projects"
              data={delivery.byMonth.map((m) => ({
                month: monthShort(m.month),
                value: m.delivered,
              }))}
            />
          </div>

          <div className="grid content-start gap-4 sm:grid-cols-2">
            <Stat
              label="Typical build"
              value={delivery.medianDays === null ? "—" : `${delivery.medianDays} days`}
              hint={delivery.medianDays === null ? "No dated projects yet" : "Start to handover"}
            />
            <Stat label="On time" value={String(delivery.onTime)} tone="good" />
            <Stat
              label="Late"
              value={String(delivery.late)}
              tone={delivery.late ? "warn" : "default"}
            />
            <Stat label="Delivered" value={String(delivery.delivered)} />
          </div>
        </div>
      </section>

      {/* ── Pipeline ────────────────────────────────────────────── */}
      <section className="mt-8 mb-4">
        <h2 className="text-base">Pipeline</h2>
        <p className="mt-1 mb-3 text-xs leading-relaxed text-bone-300">
          Quotes sent in this range, and what became of them.
        </p>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <Stat label="Quotes sent" value={String(pipeline.quoted)} />
          <Stat label="Won" value={String(pipeline.won)} tone="good" />
          <Stat label="Lost" value={String(pipeline.lost)} />
          <Stat
            label="Close rate"
            value={pipeline.closeRate === null ? "—" : `${pipeline.closeRate}%`}
            /* Deliberately blank under five closed deals — a percentage from
               two data points is a rumour, not a number. */
            hint={pipeline.closeRate === null ? "Needs 5 closed deals" : "Won of everything closed"}
          />
          <Stat
            label="Days to close"
            value={pipeline.avgDaysToClose === null ? "—" : String(pipeline.avgDaysToClose)}
            hint={pipeline.avgDaysToClose === null ? "No quoted deals closed" : "Quote to signature"}
          />
        </div>
      </section>
    </>
  );
}
