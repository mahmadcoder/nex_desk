import Link from "next/link";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { PageHead } from "@/components/admin/ui";
import ReportTable from "@/components/admin/ReportTable";
import { REPORTS, type ReportKey } from "@/lib/reports";
import { rangeFor, asDate, isPreset, rangeLabel, RANGE_PRESETS, type Range } from "@/lib/dates";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

/**
 * The five reports, one screen.
 *
 * Owner/admin only — every one of these carries either salary, margin or
 * lifetime client value.
 *
 * Each is built from live tables at request time rather than a stored snapshot:
 * a report that can go stale is a report somebody eventually acts on when it
 * has.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; range?: string; from?: string; to?: string }>;
}) {
  await requireOwnerAdmin();

  const { r, range: rawRange, from: rawFrom, to: rawTo } = await searchParams;

  const key = (REPORTS.find((x) => x.key === r)?.key ?? "revenue") as ReportKey;
  const report = REPORTS.find((x) => x.key === key)!;

  const customFrom = asDate(rawFrom);
  const customTo = asDate(rawTo);
  const range: Range =
    customFrom && customTo && customFrom <= customTo
      ? { from: customFrom, to: customTo }
      : rangeFor(isPreset(rawRange) ? rawRange : "month");

  const rows = await report.build(range);
  const label = rangeLabel(range);

  const qs = (next: Partial<{ r: string; range: string }>) => {
    const p = new URLSearchParams();
    p.set("r", next.r ?? key);
    if (next.range ?? rawRange) p.set("range", next.range ?? rawRange!);
    return `?${p.toString()}`;
  };

  return (
    <>
      <PageHead title="Reports" sub={`${report.label} · ${label}`} />

      {/* Scrolls on a phone rather than wrapping into three ragged rows. */}
      <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {REPORTS.map((x) => (
          <Link
            key={x.key}
            href={qs({ r: x.key })}
            className={`mono-tag shrink-0 rounded-lg border px-3 py-1.5 text-[11px] ${
              x.key === key
                ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
                : "border-ink-600 text-bone-400 hover:text-bone-100"
            }`}
          >
            {x.label}
          </Link>
        ))}
      </div>

      <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {/* Read from RANGE_PRESETS rather than a hardcoded list — a key that
            does not exist silently falls back to "this month" while its chip
            still looks selected. */}
        {RANGE_PRESETS.map((p) => (
          <Link
            key={p.key}
            href={qs({ range: p.key })}
            className={`mono-tag shrink-0 rounded-lg border px-3 py-1.5 text-[11px] ${
              (isPreset(rawRange) ? rawRange : "month") === p.key
                ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
                : "border-ink-600 text-bone-400 hover:text-bone-100"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <ReportTable
        rows={rows}
        filename={`nexdesk-${key}-${range.from}-to-${range.to}`}
        emptyLabel={`No ${report.label.toLowerCase()} data in ${label.toLowerCase()}.`}
      />
    </>
  );
}
