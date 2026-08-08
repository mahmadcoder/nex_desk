import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { PageHead, Table } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/datetime";
import { describeAction, ENTITY_FILTERS } from "@/config/auditActions";
import { ShieldAlert } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "all", label: "Everything" },
];

/**
 * Who did what.
 *
 * `audit_log` has recorded around forty actions since launch and nothing ever
 * displayed them — "who deleted that file" was unanswerable even though the
 * answer was sitting in the table.
 *
 * Owner/admin only. An audit log a staff member can read is a list of what
 * everyone else earns, changes and deletes.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; entity?: string; days?: string; q?: string }>;
}) {
  await requireOwnerAdmin();
  const db = createAdminClient();

  const { who, entity, days = "7", q } = await searchParams;

  let query = db
    .from("audit_log")
    .select("*, profiles(id, full_name, email)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (who) query = query.eq("actor_id", who);
  if (entity) query = query.eq("entity", entity);
  if (days !== "all") {
    const since = new Date(Date.now() - Number(days) * 864e5).toISOString();
    query = query.gte("created_at", since);
  }

  const [{ data: rows, error }, { data: actors }] = await Promise.all([
    query,
    db.from("profiles").select("id, full_name, email").order("full_name"),
  ]);

  if (error) console.error("audit log read failed", error);

  // Free text runs in memory over the fetched page rather than as a database
  // filter: `meta` is jsonb of wildly different shapes, and an ilike against it
  // cannot use an index anyway.
  const needle = q?.trim().toLowerCase();
  const list = needle
    ? (rows ?? []).filter((r: any) =>
        `${r.action} ${JSON.stringify(r.meta ?? {})} ${(r.profiles as any)?.full_name ?? ""}`
          .toLowerCase()
          .includes(needle)
      )
    : rows ?? [];

  return (
    <>
      <PageHead
        title="Audit log"
        sub="Every recorded change, newest first. Reading this page changes nothing and is not itself recorded."
      />

      <form className="mb-5 flex flex-wrap items-end gap-2">
        <div>
          <label className="mono-tag mb-1.5 block text-[10px]">Who</label>
          <select
            name="who"
            defaultValue={who ?? ""}
            className="rounded-lg border border-ink-500 bg-ink-800 px-2.5 py-1.5 text-xs focus:border-lime-400 focus:outline-none"
          >
            <option value="">Anyone</option>
            {(actors ?? []).map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.full_name || a.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mono-tag mb-1.5 block text-[10px]">What</label>
          <select
            name="entity"
            defaultValue={entity ?? ""}
            className="rounded-lg border border-ink-500 bg-ink-800 px-2.5 py-1.5 text-xs focus:border-lime-400 focus:outline-none"
          >
            <option value="">Everything</option>
            {ENTITY_FILTERS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mono-tag mb-1.5 block text-[10px]">When</label>
          <select
            name="days"
            defaultValue={days}
            className="rounded-lg border border-ink-500 bg-ink-800 px-2.5 py-1.5 text-xs focus:border-lime-400 focus:outline-none"
          >
            {RANGES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[150px] flex-1">
          <label className="mono-tag mb-1.5 block text-[10px]">Search</label>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="a name, an email, a field…"
            className="w-full rounded-lg border border-ink-500 bg-ink-800 px-2.5 py-1.5 text-xs focus:border-lime-400 focus:outline-none"
          />
        </div>

        <button className="btn btn-primary h-[30px] px-3 text-xs">Filter</button>
        {(who || entity || q || days !== "7") && (
          <Link href="/nx-control/audit" className="mono-tag text-[11px] hover:text-lime-400">
            reset
          </Link>
        )}
      </form>

      <p className="mono-tag mb-3 text-[11px]">
        {list.length} record{list.length === 1 ? "" : "s"}
        {list.length === 300 ? " (capped — narrow the range)" : ""}
      </p>

      <div className="overflow-x-auto">
        <Table head={["When", "Who", "What happened", "Details"]}>
          {list.map((r: any) => {
            const desc = describeAction(r.action);
            const failed = r.action === "auth.login_failed";

            return (
              <tr key={r.id} className="hover:bg-ink-700/30">
                <td className="whitespace-nowrap px-5 py-3 text-bone-400">
                  {fmtDateTime(r.created_at)}
                </td>
                <td className="px-5 py-3">
                  <p className="text-bone-100">
                    {(r.profiles as any)?.full_name ?? (r.meta?.email ? r.meta.email : "System")}
                  </p>
                  {r.ip && <p className="mono-tag text-[10px]">{r.ip}</p>}
                </td>
                <td className="px-5 py-3">
                  <span className={failed ? "inline-flex items-center gap-1.5 text-amber-400" : ""}>
                    {failed && <ShieldAlert size={12} aria-hidden />}
                    {desc}
                  </span>
                  <p className="mono-tag text-[10px] text-bone-500">{r.action}</p>
                </td>
                <td className="px-5 py-3">
                  <MetaCell meta={r.meta} />
                </td>
              </tr>
            );
          })}
          {!list.length && (
            <tr>
              <td colSpan={4} className="px-5 py-8 text-center text-bone-400">
                Nothing recorded in this range.
              </td>
            </tr>
          )}
        </Table>
      </div>
    </>
  );
}

/**
 * `meta` as something readable.
 *
 * Several actions store before/after; raw JSON hides that behind braces. Keys
 * are humanised and long values clipped, because the point of this column is to
 * be scanned rather than parsed.
 */
function MetaCell({ meta }: { meta: any }) {
  if (!meta || typeof meta !== "object" || !Object.keys(meta).length) {
    return <span className="text-bone-600">—</span>;
  }

  const entries = Object.entries(meta).slice(0, 6);

  return (
    <ul className="space-y-0.5 text-[11px]">
      {entries.map(([k, v]) => (
        <li key={k} className="flex gap-1.5">
          <span className="shrink-0 text-bone-500">{k.replace(/_/g, " ")}:</span>
          <span className="min-w-0 break-all text-bone-300">{render(v)}</span>
        </li>
      ))}
      {Object.keys(meta).length > 6 && (
        <li className="text-bone-600">+{Object.keys(meta).length - 6} more</li>
      )}
    </ul>
  );
}

function render(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 90 ? `${s.slice(0, 90)}…` : s;
}
