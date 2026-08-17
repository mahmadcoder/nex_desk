import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Stat } from "@/components/admin/ui";
import { listIntakeRequests } from "@/lib/actions/intake";
import RequestDetailsClient, { IntakeRow } from "@/components/admin/RequestDetailsClient";
import { Inbox, User, Users } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Onboarding & Request Details" };
export const dynamic = "force-dynamic";

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; kind?: string }>;
}) {
  const me = await getCurrentStaff();
  if (!me) return null;

  const allRows = await listIntakeRequests();
  const isPrivileged = me.isPrivileged;

  // Staff only see forms requested from or filled by them specifically
  const rows = isPrivileged
    ? allRows
    : allRows.filter((r: any) =>
        (r.recipient_email && r.recipient_email.toLowerCase() === me.email.toLowerCase()) ||
        r.staff_id === me.employeeId
      );

  const params = (await searchParams) ?? {};
  const activeTab = params.tab || "all";
  const activeKind = params.kind || "all";

  // Category Filter (Client vs Staff vs All)
  const categoryRows =
    activeKind === "client"
      ? rows.filter((r: any) => r.kind === "client")
      : activeKind === "staff"
        ? rows.filter((r: any) => r.kind === "staff")
        : rows;

  const clientRows = rows.filter((r: any) => r.kind === "client");
  const staffRows = rows.filter((r: any) => r.kind === "staff");

  const waiting = categoryRows.filter((r: any) => r.status === "submitted");
  const pending = categoryRows.filter((r: any) => r.status === "pending");
  const closed = categoryRows.filter((r: any) => ["approved", "resolved", "revoked"].includes(r.status));

  const filteredRows =
    activeTab === "submitted"
      ? waiting
      : activeTab === "pending"
        ? pending
        : activeTab === "resolved"
          ? closed
          : categoryRows;

  return (
    <>
      <PageHead
        title={isPrivileged ? "Request Details & Onboarding" : "My Request Details Forms"}
        sub={
          isPrivileged
            ? waiting.length
              ? `${waiting.length} submission(s) received & ready for review.`
              : "Send clients or staff a link after a call to collect details."
            : "View the onboarding and details forms requested from you."
        }
        action={
          isPrivileged ? (
            <div className="flex flex-wrap gap-2">
              <RequestDetailsClient kind="client" />
              <RequestDetailsClient kind="staff" />
            </div>
          ) : null
        }
      />

      {/* Summary Analytics Cards for Client & Staff Requests */}
      <div className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Client Requests"
          value={String(clientRows.length)}
          hint={`${clientRows.filter((r: any) => r.status === "submitted").length} submitted · ${clientRows.filter((r: any) => r.status === "pending").length} pending`}
        />
        <Stat
          label="Staff Requests"
          value={String(staffRows.length)}
          hint={`${staffRows.filter((r: any) => r.status === "submitted").length} submitted · ${staffRows.filter((r: any) => r.status === "pending").length} pending`}
        />
        <Stat
          label="Action Needed"
          value={String(waiting.length)}
          hint="Submissions ready to review"
          tone={waiting.length > 0 ? "good" : "default"}
        />
        <Stat
          label="Resolved / Done"
          value={String(closed.length)}
          hint="Completed onboarding forms"
        />
      </div>

      {/* Primary Category Switcher (Client vs Staff) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-600 pb-3">
        <div className="flex flex-wrap gap-2">
          <CategoryLink
            href="/nx-control/intake"
            label="All Requests"
            count={rows.length}
            active={activeKind === "all"}
          />
          <CategoryLink
            href="/nx-control/intake?kind=client"
            label="Client Onboarding"
            count={clientRows.length}
            active={activeKind === "client"}
            icon={<User size={13} />}
          />
          <CategoryLink
            href="/nx-control/intake?kind=staff"
            label="Staff / Team Onboarding"
            count={staffRows.length}
            active={activeKind === "staff"}
            icon={<Users size={13} />}
          />
        </div>

        {/* Secondary Status Filter Tabs */}
        <div className="flex flex-wrap gap-1.5">
          <TabLink href={`/nx-control/intake?kind=${activeKind}`} label="All" count={categoryRows.length} active={activeTab === "all"} />
          <TabLink href={`/nx-control/intake?kind=${activeKind}&tab=submitted`} label="Received" count={waiting.length} active={activeTab === "submitted"} />
          <TabLink href={`/nx-control/intake?kind=${activeKind}&tab=pending`} label="Pending" count={pending.length} active={activeTab === "pending"} />
          <TabLink href={`/nx-control/intake?kind=${activeKind}&tab=resolved`} label="Resolved" count={closed.length} active={activeTab === "resolved"} />
        </div>
      </div>

      {!filteredRows.length ? (
        <div className="card mt-6 p-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-bone-500" aria-hidden />
          <p className="mt-4 text-sm text-bone-200">No request details in this view.</p>
          {isPrivileged && (
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-bone-400">
              Press Request Client / Staff Details above to generate a custom WhatsApp message, PDF, and link.
            </p>
          )}
        </div>
      ) : activeTab !== "all" ? (
        <div className="mt-6">
          <ul className="card divide-y divide-ink-600">
            {filteredRows.map((r: any) => (
              <IntakeRow key={r.id} row={r} isPrivileged={isPrivileged} />
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <Group title="Received & Ready to Review" rows={waiting} isPrivileged={isPrivileged} />
          <Group title="Waiting on Recipient" rows={pending} isPrivileged={isPrivileged} />
          <Group title="Resolved & Completed" rows={closed} isPrivileged={isPrivileged} />
        </div>
      )}
    </>
  );
}

function CategoryLink({
  href,
  label,
  count,
  active,
  icon,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mono-tag inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors",
        active
          ? "bg-lime-400/10 text-lime-400 font-semibold border border-lime-400/30"
          : "text-bone-400 hover:text-bone-100 hover:bg-ink-800"
      )}
    >
      {icon}
      {label} <span className="text-[10px] text-bone-500">({count})</span>
    </Link>
  );
}

function TabLink({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mono-tag inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] transition-colors",
        active
          ? "bg-ink-700 text-bone-50 font-medium"
          : "text-bone-400 hover:text-bone-200"
      )}
    >
      {label} <span className="text-[10px] text-bone-500">({count})</span>
    </Link>
  );
}

function Group({ title, rows, isPrivileged = true }: { title: string; rows: any[]; isPrivileged?: boolean }) {
  if (!rows.length) return null;

  return (
    <section>
      <h2 className="mono-tag mb-3">
        {title} <span className="text-bone-500">({rows.length})</span>
      </h2>
      <ul className="card divide-y divide-ink-600">
        {rows.map((r) => (
          <IntakeRow key={r.id} row={r} isPrivileged={isPrivileged} />
        ))}
      </ul>
    </section>
  );
}
