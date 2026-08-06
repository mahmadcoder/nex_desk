import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Badge, Stat, Table, Empty } from "@/components/admin/ui";
import { money, moneyMulti, sumByCurrency, cn } from "@/lib/utils";
import { pipelineStats } from "@/lib/actions/quotes";
import { fmtDate } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "Deals" };
export const dynamic = "force-dynamic";

/**
 * The sales pipeline.
 *
 * Until now this was a flat table of every deal ever, and there was nothing
 * else to show — a deal was built and locked in one motion, so "open" did not
 * exist as a state. With quotes, the interesting rows are the ones that have
 * not been decided yet, so those lead and everything else is a filter away.
 */

const FILTERS = [
  { key: "open",   label: "Open quotes" },
  { key: "locked", label: "Won" },
  { key: "lost",   label: "Lost" },
  { key: "draft",  label: "Drafts" },
  { key: "all",    label: "Everything" },
];

/** Days between a past timestamp and now. */
const daysSince = (iso: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null;

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const me = await getCurrentStaff();
  // Deals are commercial. The /deals segment is already outside the staff
  // allowlist; this is the second lock on the same door.
  if (!me?.isPrivileged) return null;

  const db = createAdminClient();
  const { status } = await searchParams;

  const { data: deals, error } = await db
    .from("deals")
    .select("*, clients(name, company)")
    .order("created_at", { ascending: false });

  // A select naming a column that does not exist returns an error and NULL
  // data, so the page would render as merely empty rather than broken — which
  // is exactly how a missing `deals.service_slugs` hid for months.
  if (error) {
    console.error("Failed to load deals", error);
  }

  const all = deals ?? [];

  // "Lost" is `cancelled` WITH `lost_at` — no new enum value was added, since
  // Postgres will not let one be referenced in the migration that adds it.
  const isLost = (d: any) => !!d.lost_at;
  const isOpen = (d: any) => d.status === "sent";

  // Open quotes lead, because they are the ones still needing a decision — but
  // only when there are any. Defaulting to an empty "Open quotes" view on an
  // account whose deals are all already won would just look broken.
  const explicit = FILTERS.some((f) => f.key === status);
  const filter = explicit ? status! : all.some(isOpen) ? "open" : "all";

  const rows = all.filter((d) => {
    if (filter === "all") return true;
    if (filter === "open") return isOpen(d);
    if (filter === "locked") return d.status === "locked";
    if (filter === "lost") return isLost(d);
    if (filter === "draft") return d.status === "draft";
    return true;
  });

  const counts = {
    open: all.filter(isOpen).length,
    locked: all.filter((d) => d.status === "locked").length,
    lost: all.filter(isLost).length,
    draft: all.filter((d) => d.status === "draft").length,
    all: all.length,
  } as Record<string, number>;

  const openValue = sumByCurrency(
    all.filter(isOpen),
    (d: any) => d.currency,
    (d: any) => Number(d.total)
  );

  const { won, lost, closeRate, avgDaysToClose } = await pipelineStats();

  return (
    <>
      <PageHead
        title="Deals"
        sub="Quotes waiting on a decision, and everything already won or lost."
        action={<Link href={`${BASE}/deals/new`} className="btn btn-primary h-10">New deal</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Out with clients"
          value={openValue.length ? moneyMulti(openValue) : "—"}
          hint={`${counts.open} quote${counts.open === 1 ? "" : "s"} awaiting a decision`}
        />
        <Stat
          label="Win rate"
          // Below five closed deals a percentage is noise dressed as a number,
          // so `pipelineStats` returns null and we show the raw counts instead.
          value={closeRate !== null ? `${Math.round(closeRate * 100)}%` : "—"}
          hint={
            closeRate !== null
              ? `${won} won, ${lost} lost in the last 12 months`
              : `${won} won, ${lost} lost — too few to rate yet`
          }
          tone={closeRate !== null && closeRate >= 0.4 ? "good" : "default"}
        />
        <Stat
          label="Average time to close"
          value={avgDaysToClose !== null ? `${avgDaysToClose} days` : "—"}
          hint={
            avgDaysToClose !== null
              ? "From quote sent to agreement locked"
              : "Appears once a quoted deal has been won"
          }
        />
        <Stat
          label="Won"
          value={String(counts.locked)}
          hint="Agreements with a project behind them"
          tone="good"
        />
      </div>

      <div className="mt-8 mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`${BASE}/deals?status=${f.key}`}
            className={cn(
              "mono-tag rounded-full border px-3 py-1.5 text-[11px] transition-colors",
              filter === f.key
                ? "border-lime-400/50 bg-lime-400/10 text-lime-300"
                : "border-ink-600 text-bone-300 hover:border-ink-400 hover:text-bone-100"
            )}
          >
            {f.label} ({counts[f.key] ?? 0})
          </Link>
        ))}
      </div>

      {!rows.length ? (
        <Empty
          title={filter === "open" ? "No quotes are waiting" : "Nothing here"}
          body={
            filter === "open"
              ? "Build a deal and send it as a quote — it lands here until the client decides, and gets chased for you on day 3, 7 and 14."
              : "Try another filter, or start a new deal."
          }
          href={`${BASE}/deals/new`}
          cta="New deal"
        />
      ) : (
        <Table head={["Deal", "Client", "Total", "Status", "Age", "Chased", ""]}>
          {rows.map((d: any) => {
            const sent = daysSince(d.quote_sent_at);
            const chases = Number(d.followup_count ?? 0);
            const stale = isOpen(d) && sent !== null && sent > 21;

            return (
              <tr key={d.id} className="hover:bg-ink-700/30">
                <td className="px-5 py-3">
                  <p style={{ fontFamily: "var(--font-mono)" }} className="text-xs text-bone-400">
                    {d.deal_no}
                  </p>
                  <Link href={`${BASE}/deals/${d.id}`} className="hover:text-lime-400">
                    {d.title}
                  </Link>
                  {isLost(d) && d.lost_reason && (
                    <p className="mt-0.5 text-[11px] text-bone-400">Lost: {d.lost_reason}</p>
                  )}
                </td>

                <td className="px-5 py-3 text-bone-400">
                  <Link href={`${BASE}/clients/${d.client_id}`} className="hover:text-lime-400">
                    {d.clients?.name}
                  </Link>
                  {d.clients?.company && (
                    <span className="block text-xs">{d.clients.company}</span>
                  )}
                </td>

                <td className="px-5 py-3 font-mono text-xs">
                  {money(Number(d.total), d.currency)}
                </td>

                <td className="px-5 py-3">
                  <Badge>{isLost(d) ? "lost" : d.status}</Badge>
                </td>

                <td className="px-5 py-3 text-xs text-bone-400">
                  {isOpen(d) && sent !== null ? (
                    <span className={stale ? "text-amber-300" : ""}>
                      {sent === 0 ? "sent today" : `${sent}d ago`}
                    </span>
                  ) : d.locked_at ? (
                    fmtDate(d.locked_at)
                  ) : (
                    "—"
                  )}
                </td>

                <td className="px-5 py-3 text-xs text-bone-400">
                  {isOpen(d) ? (
                    <span className={chases >= 3 ? "text-amber-300" : ""}>{chases}/3</span>
                  ) : (
                    "—"
                  )}
                </td>

                <td className="px-5 py-3 text-right">
                  <Link
                    href={`${BASE}/deals/${d.id}`}
                    className="text-xs text-bone-400 hover:text-lime-400"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {filter === "open" && !!counts.open && (
        <p className="mt-4 text-[11px] leading-relaxed text-bone-300">
          Open quotes are chased automatically on day 3, 7 and 14, then left alone and reported
          to you as gone cold. Nothing is ever cancelled for you — that call is yours.
        </p>
      )}
    </>
  );
}
