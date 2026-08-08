import Link from "next/link";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Badge } from "@/components/admin/ui";
import { visibleTickets } from "@/lib/actions/tickets";
import { fmtDate } from "@/lib/datetime";
import { LifeBuoy, Flag, Clock } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Tickets" };
export const dynamic = "force-dynamic";

const OPEN = ["open", "in_progress", "waiting_client"];

const PRIORITY: Record<string, string> = {
  urgent: "border-rose-400/40 bg-rose-400/10 text-rose-300",
  high: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  normal: "border-ink-600 bg-ink-800 text-bone-400",
  low: "border-ink-600 bg-ink-800 text-bone-500",
};

/**
 * The support queue.
 *
 * Staff see tickets for the clients they are assigned to; owner/admin see all.
 * Scoped inside `visibleTickets`, which fails closed.
 */
export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const me = await getCurrentStaff();
  if (!me) return null;

  const { show } = await searchParams;
  const closedView = show === "closed";

  const all = await visibleTickets();
  const rows = all.filter((t: any) =>
    closedView ? !OPEN.includes(t.status) : OPEN.includes(t.status)
  );

  const waiting = all.filter((t: any) => t.status === "open" && !t.first_response_at).length;

  return (
    <>
      <PageHead
        title="Support tickets"
        sub={
          waiting
            ? `${waiting} still waiting for a first reply.`
            : "Nothing is waiting on a first reply."
        }
        action={
          <Link
            href={closedView ? "/nx-control/tickets" : "/nx-control/tickets?show=closed"}
            className="mono-tag text-[11px] hover:text-lime-400"
          >
            {closedView ? "← open tickets" : "resolved & closed"}
          </Link>
        }
      />

      {!rows.length ? (
        <p className="card p-10 text-center text-sm text-bone-400">
          <LifeBuoy className="mx-auto mb-3 h-7 w-7 text-bone-500" aria-hidden />
          {closedView ? "Nothing closed yet." : "No open tickets. Enjoy it."}
        </p>
      ) : (
        <ul className="card divide-y divide-ink-600">
          {rows.map((t: any) => {
            const age = Math.floor((Date.now() - +new Date(t.created_at)) / 864e5);
            const unanswered = !t.first_response_at && OPEN.includes(t.status);

            return (
              <li key={t.id}>
                <Link
                  href={`/nx-control/tickets/${t.id}`}
                  className="flex flex-wrap items-start justify-between gap-3 p-4 transition-colors hover:bg-ink-700/30"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-bone-100">{t.subject}</p>
                    <p className="mono-tag mt-1 text-[10px]">
                      {t.clients?.name}
                      {t.projects?.name ? ` · ${t.projects.name}` : ""}
                      {t.employees?.full_name ? ` · ${t.employees.full_name}` : " · unassigned"}
                    </p>
                    <p className="mt-1 text-xs text-bone-400">
                      {fmtDate(t.created_at)} · {age === 0 ? "today" : `${age}d old`}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] capitalize ${
                        PRIORITY[t.priority] ?? PRIORITY.normal
                      }`}
                    >
                      <Flag size={9} aria-hidden /> {t.priority}
                    </span>
                    <Badge>{String(t.status).replace(/_/g, " ")}</Badge>
                    {unanswered && (
                      <span className="mono-tag inline-flex items-center gap-1 text-[10px] text-amber-400">
                        <Clock size={9} /> no reply yet
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
