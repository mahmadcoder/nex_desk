import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Badge, Empty, Stat } from "@/components/admin/ui";
import { money, moneyMulti, sumByCurrency } from "@/lib/utils";
import { PackageCheck, Moon } from "lucide-react";
import ReactivateButton from "@/components/admin/ReactivateButton";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "Completed" };
export const dynamic = "force-dynamic";

/**
 * Finished work, and the clients behind it.
 *
 * Delivered projects and dormant clients were scattered across the main lists,
 * so a page of live work was padded with things that finished months ago. This
 * is where they go — and it is the natural place to bring someone back from,
 * because everyone you would want to sell to again is already on it.
 */
export default async function CompletedPage() {
  const me = await getCurrentStaff();
  if (!me?.isPrivileged) return null;

  const db = createAdminClient();

  const [{ data: projects }, { data: dormant }] = await Promise.all([
    db.from("projects")
      .select("*, clients(id, name, company, lifecycle), deals(total, currency)")
      .in("status", ["delivered", "completed"])
      .order("handed_over_at", { ascending: false, nullsFirst: false }),
    db.from("clients")
      .select("*, projects(id), invoices(total, amount_paid, currency, status)")
      .neq("lifecycle", "active")
      .order("dormant_at", { ascending: false, nullsFirst: false }),
  ]);

  const delivered = projects ?? [];
  const sleeping = dormant ?? [];

  // What the finished work was worth — the number that tells you whether
  // reactivating any of these is worth an afternoon.
  const lifetime = sumByCurrency(
    delivered.filter((p: any) => p.deals),
    (p: any) => p.deals.currency,
    (p: any) => Number(p.deals.total || 0)
  );

  return (
    <>
      <PageHead
        title="Completed"
        sub="Delivered projects and clients who are between engagements. Nothing here is lost — it is put away."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Projects delivered" value={String(delivered.length)} tone="good" />
        <Stat label="Dormant clients" value={String(sleeping.length)} />
        <Stat label="Delivered contract value" value={moneyMulti(lifetime, "—")} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-base">
          <PackageCheck size={15} className="text-lime-400" /> Delivered projects
        </h2>

        {!delivered.length ? (
          <Empty
            title="Nothing delivered yet"
            body="Projects appear here once they are handed over or marked completed."
          />
        ) : (
          <div className="card divide-y divide-ink-600">
            {delivered.map((p: any) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link
                    href={`${BASE}/projects/${p.id}`}
                    className="text-sm font-medium text-bone-50 hover:text-lime-400"
                  >
                    {p.name}
                  </Link>
                  <p className="mono-tag mt-1 text-[11px]">
                    {p.clients?.company || p.clients?.name}
                    {p.handed_over_at
                      ? ` · handed over ${new Date(p.handed_over_at).toLocaleDateString("en-GB")}`
                      : ""}
                    {p.warranty_ends_on ? ` · warranty to ${p.warranty_ends_on}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.deals && (
                    <span className="font-mono text-xs text-bone-300">
                      {money(Number(p.deals.total), p.deals.currency)}
                    </span>
                  )}
                  <Badge>{p.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-base">
          <Moon size={15} className="text-amber-400" /> Dormant &amp; archived clients
        </h2>

        {!sleeping.length ? (
          <Empty
            title="Everyone is active"
            body="A client goes dormant when all their projects are finished. Bring them back from here when they return."
          />
        ) : (
          <div className="card divide-y divide-ink-600">
            {sleeping.map((c: any) => {
              const billed = sumByCurrency(
                ((c.invoices as any[]) ?? []).filter((i) => i.status !== "draft"),
                (i) => i.currency,
                (i) => Number(i.amount_paid)
              );
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <Link
                      href={`${BASE}/clients/${c.id}`}
                      className="text-sm font-medium text-bone-50 hover:text-lime-400"
                    >
                      {c.name}
                    </Link>
                    <p className="mono-tag mt-1 text-[11px]">
                      {c.company ? `${c.company} · ` : ""}
                      {((c.projects as any[]) ?? []).length} project
                      {((c.projects as any[]) ?? []).length === 1 ? "" : "s"}
                      {billed.length ? ` · ${moneyMulti(billed)} paid to date` : ""}
                      {Number(c.return_count) > 0 ? ` · returned ${c.return_count}×` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge>{c.lifecycle}</Badge>
                    <ReactivateButton clientId={c.id} clientName={c.name} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
