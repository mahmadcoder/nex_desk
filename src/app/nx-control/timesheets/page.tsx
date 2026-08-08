import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { PageHead, Table, Badge } from "@/components/admin/ui";
import { humanDuration, decimalHours } from "@/lib/workHours";
import { agencyDay, fmtDate, TZ_LABEL } from "@/lib/datetime";
import Avatar from "@/components/Avatar";
import { AlertTriangle } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Timesheets" };
export const dynamic = "force-dynamic";

/**
 * Tracked hours, per person, per project — the billing view.
 *
 * Entries marked `manual` are called out rather than blended in. A manual entry
 * is either hand-typed or a timer the cron had to close after 12 hours, and
 * both are figures a person should look at before they reach an invoice.
 */
export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; days?: string }>;
}) {
  await requireOwnerAdmin();
  const db = createAdminClient();

  const { from: fromParam, days: daysParam } = await searchParams;
  const span = Math.min(90, Math.max(1, Number(daysParam) || 7));

  const end = fromParam ? new Date(`${fromParam}T00:00:00`) : new Date(`${agencyDay()}T00:00:00`);
  const start = new Date(end);
  start.setDate(start.getDate() - (span - 1));

  const { data: entries, error } = await db
    .from("time_entries")
    .select("*, employees(id, full_name, avatar_url), projects(id, name), tasks(title)")
    .not("ended_at", "is", null)
    .gte("started_at", start.toISOString())
    .lte("started_at", new Date(end.getTime() + 864e5 - 1).toISOString())
    .order("started_at", { ascending: false });

  if (error?.code === "42P01") {
    return (
      <>
        <PageHead title="Timesheets" sub="Not set up yet." />
        <p className="card p-8 text-center text-sm text-bone-300">
          Run <code className="text-lime-400">supabase/idempotent_fixes_2027_26.sql</code> to
          create the time_entries table.
        </p>
      </>
    );
  }

  // employee → project → seconds
  const byEmployee = new Map<string, { employee: any; total: number; manual: number; projects: Map<string, { name: string; sec: number }> }>();

  for (const e of entries ?? []) {
    const emp = (e.employees as any) ?? { id: e.employee_id, full_name: "Unknown" };
    const bucket =
      byEmployee.get(emp.id) ??
      { employee: emp, total: 0, manual: 0, projects: new Map() };

    const sec = Number(e.duration_sec ?? 0);
    bucket.total += sec;
    if (e.source === "manual") bucket.manual += sec;

    const pid = e.project_id ?? "none";
    const pname = (e.projects as any)?.name ?? "Unattributed";
    const p = bucket.projects.get(pid) ?? { name: pname, sec: 0 };
    p.sec += sec;
    bucket.projects.set(pid, p);

    byEmployee.set(emp.id, bucket);
  }

  const rows = [...byEmployee.values()].sort((a, b) => b.total - a.total);
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <>
      <PageHead
        title="Timesheets"
        sub={`${fmtDate(start)} – ${fmtDate(end)} · ${TZ_LABEL} · ${humanDuration(grandTotal)} tracked in total.`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[7, 14, 30].map((d) => (
          <a
            key={d}
            href={`?days=${d}`}
            className={`mono-tag rounded-lg border px-3 py-1.5 text-[11px] ${
              span === d
                ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
                : "border-ink-600 text-bone-400 hover:text-bone-100"
            }`}
          >
            last {d} days
          </a>
        ))}
      </div>

      {!rows.length ? (
        <p className="card p-8 text-center text-sm text-bone-400">
          No tracked time in this period.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <section key={r.employee.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-600 pb-4">
                <div className="flex items-center gap-2.5">
                  <Avatar name={r.employee.full_name} src={r.employee.avatar_url} size="sm" />
                  <p className="text-sm font-medium text-bone-100">{r.employee.full_name}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  {r.manual > 0 && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] text-amber-400"
                      title="Hand-entered, or a timer the system had to close after 12 hours"
                    >
                      <AlertTriangle size={11} /> {humanDuration(r.manual)} manual
                    </span>
                  )}
                  <div>
                    <p
                      className="text-lg leading-none text-lime-400"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {humanDuration(r.total)}
                    </p>
                    <p className="mono-tag mt-0.5 text-[10px]">{decimalHours(r.total)} h</p>
                  </div>
                </div>
              </div>

              <ul className="mt-3 divide-y divide-ink-700/60">
                {[...r.projects.values()]
                  .sort((a, b) => b.sec - a.sec)
                  .map((p) => (
                    <li
                      key={p.name}
                      className="flex items-center justify-between gap-4 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-bone-200">{p.name}</span>
                      <span className="shrink-0 text-bone-300" style={{ fontFamily: "var(--font-mono)" }}>
                        {humanDuration(p.sec)}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section className="mt-8">
        <h2 className="mono-tag mb-3">Entries</h2>
        <Table head={["When", "Who", "Project / task", "Duration", "Source"]}>
          {(entries ?? []).slice(0, 100).map((e: any) => (
            <tr key={e.id} className="hover:bg-ink-700/30">
              <td className="px-5 py-3 text-bone-400">{fmtDate(e.started_at)}</td>
              <td className="px-5 py-3">{e.employees?.full_name ?? "—"}</td>
              <td className="px-5 py-3 text-bone-300">
                {e.tasks?.title ?? e.projects?.name ?? e.note ?? "Unattributed"}
              </td>
              <td className="px-5 py-3" style={{ fontFamily: "var(--font-mono)" }}>
                {humanDuration(e.duration_sec)}
              </td>
              <td className="px-5 py-3">
                {e.source === "manual" ? <Badge>manual</Badge> : <span className="mono-tag text-[10px]">timer</span>}
              </td>
            </tr>
          ))}
          {!entries?.length && (
            <tr>
              <td colSpan={5} className="px-5 py-8 text-center text-bone-400">
                Nothing tracked yet.
              </td>
            </tr>
          )}
        </Table>
      </section>
    </>
  );
}
