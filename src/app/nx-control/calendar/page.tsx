import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { PageHead } from "@/components/admin/ui";
import { buildCalendar, monthGrid, isoOf, KIND_STYLE, type CalendarKind } from "@/lib/calendar";
import { agencyDay, fmtMonth, fmtTime } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Meetings, deadlines, milestones and leave, in one month.
 *
 * Everything here already exists in another table — nothing new is stored, so
 * the calendar can never disagree with the project it is describing.
 *
 * Scoped like everywhere else: staff see only their assigned clients, plus
 * their own leave.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const me = await getCurrentStaff();
  if (!me) return null;

  const db = createAdminClient();
  const canManage = me.isPrivileged;
  const clientIds = canManage ? null : await assignedClientIds(me.employeeId);

  const { month } = await searchParams;
  const anchor = new Date(`${month ?? agencyDay().slice(0, 7)}-01T00:00:00`);
  const year = anchor.getFullYear();
  const mon = anchor.getMonth();

  const from = isoOf(new Date(year, mon, 1));
  const to = isoOf(new Date(year, mon + 1, 0));

  // A staff member with no assignments must match nothing, not everything.
  const scope = <T,>(q: any, column = "client_id") =>
    clientIds ? q.in(column, clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]) : q;

  const [{ data: meetings }, { data: projects }, { data: leave }] = await Promise.all([
    scope(
      db
        .from("meetings")
        .select("id, title, starts_at, status, client_id, clients(name)")
        .gte("starts_at", `${from}T00:00:00`)
        .lte("starts_at", `${to}T23:59:59`)
    ),
    scope(
      db
        .from("projects")
        .select("id, name, deadline, estimated_delivery, client_id")
        .or(
          `and(deadline.gte.${from},deadline.lte.${to}),and(estimated_delivery.gte.${from},estimated_delivery.lte.${to})`
        )
    ),
    db
      .from("leave_requests")
      .select("id, start_date, end_date, leave_type, employee_id, employees(full_name)")
      .eq("status", "approved")
      .lte("start_date", to)
      .gte("end_date", from)
      // Staff see their own leave only; whose else is off is management info.
      .then((r: any) =>
        canManage
          ? r
          : { ...r, data: (r.data ?? []).filter((l: any) => l.employee_id === me.employeeId) }
      ),
  ]);

  const projectIds = (projects ?? []).map((p: any) => p.id);
  const { data: milestones } = projectIds.length
    ? await db
        .from("milestones")
        .select("id, title, due_date, is_done, project_id, projects(name)")
        .in("project_id", projectIds)
        .gte("due_date", from)
        .lte("due_date", to)
    : { data: [] as any[] };

  const byDay = buildCalendar({
    meetings: meetings ?? [],
    projects: projects ?? [],
    milestones: milestones ?? [],
    leave: leave ?? [],
  });

  const grid = monthGrid(year, mon);
  const today = agencyDay();
  const monthParam = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  // Agenda for small screens — a 7-column grid at 390px is unreadable, and an
  // ordered list of what is actually coming is more useful anyway.
  const agenda = [...byDay.entries()]
    .filter(([d]) => d >= from && d <= to)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <PageHead
        title="Calendar"
        sub={
          canManage
            ? "Meetings, deadlines, milestones and leave across the agency."
            : "Your meetings, deadlines and milestones."
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`?month=${monthParam(new Date(year, mon - 1, 1))}`} className="mono-tag hover:text-lime-400">
            ← prev
          </Link>
          <span className="text-sm text-bone-200">{fmtMonth(anchor)}</span>
          <Link href={`?month=${monthParam(new Date(year, mon + 1, 1))}`} className="mono-tag hover:text-lime-400">
            next →
          </Link>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-bone-400">
          {(Object.keys(KIND_STYLE) as CalendarKind[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${KIND_STYLE[k].dot}`} />
              {KIND_STYLE[k].label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Month grid (md and up) ── */}
      <div className="card hidden overflow-hidden md:block">
        <div className="grid grid-cols-7 border-b border-ink-600">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[11px] text-bone-400">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d) => {
            const iso = isoOf(d);
            const items = byDay.get(iso) ?? [];
            const outside = d.getMonth() !== mon;
            const isToday = iso === today;

            return (
              <div
                key={iso}
                className={`min-h-[104px] border-b border-r border-ink-700/60 p-1.5 ${
                  outside ? "bg-ink-950/40" : ""
                }`}
              >
                <p
                  className={`mb-1 text-[11px] ${
                    isToday
                      ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-lime-400 font-semibold text-lime-950"
                      : outside
                        ? "text-bone-600"
                        : "text-bone-400"
                  }`}
                >
                  {d.getDate()}
                </p>

                <div className="space-y-0.5">
                  {items.slice(0, 3).map((i, n) => (
                    <Link
                      key={`${iso}-${n}`}
                      href={i.href ?? "#"}
                      title={`${KIND_STYLE[i.kind].label}: ${i.title}${i.detail ? ` — ${i.detail}` : ""}`}
                      className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] hover:bg-ink-800"
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${KIND_STYLE[i.kind].dot}`} />
                      <span className="truncate text-bone-300">
                        {i.time ? `${fmtTime(i.time)} ` : ""}
                        {i.title}
                      </span>
                    </Link>
                  ))}
                  {items.length > 3 && (
                    <p className="px-1 text-[10px] text-bone-500">+{items.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Agenda (below md) ── */}
      <div className="space-y-3 md:hidden">
        {!agenda.length && (
          <p className="card p-8 text-center text-sm text-bone-400">Nothing this month.</p>
        )}
        {agenda.map(([iso, items]) => (
          <section key={iso} className={`card p-4 ${iso === today ? "border-lime-400/30" : ""}`}>
            <p className="mono-tag mb-2">
              {new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
              {iso === today ? " · today" : ""}
            </p>
            <ul className="space-y-2">
              {items.map((i, n) => (
                <li key={n} className="flex items-start gap-2 text-sm">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${KIND_STYLE[i.kind].dot}`} />
                  <div className="min-w-0">
                    <p className="text-bone-200">
                      {i.time ? `${fmtTime(i.time)} · ` : ""}
                      {i.title}
                    </p>
                    <p className="mono-tag text-[10px]">
                      {KIND_STYLE[i.kind].label}
                      {i.detail ? ` · ${i.detail}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
