import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead, Stat } from "@/components/admin/ui";
import ArchiveClient from "@/components/admin/ArchiveClient";
import { redirect } from "next/navigation";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Archive & Inactive Directory" };
export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const me = await getCurrentStaff();
  if (!me) return null;
  if (!me.isPrivileged) redirect("/nx-control");

  const db = createAdminClient();

  const [{ data: clients }, { data: employees }] = await Promise.all([
    db
      .from("clients")
      .select("id, name, company, email, phone, created_at, status, is_active")
      .or("is_active.eq.false,status.eq.inactive")
      .order("created_at", { ascending: false }),
    db
      .from("employees")
      .select("id, full_name, email, job_title, created_at, status, employment_status")
      .or("status.ilike.inactive,employment_status.ilike.inactive")
      .order("created_at", { ascending: false }),
  ]);

  const archivedClients = clients ?? [];
  const inactiveEmployees = employees ?? [];

  return (
    <>
      <PageHead
        title="Archive & Inactive Directory"
        sub="Soft-deleted clients and inactive team members. Records remain securely stored in the database and can be restored anytime."
      />

      <div className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Archived Clients"
          value={String(archivedClients.length)}
          hint="Inactive client records"
        />
        <Stat
          label="Inactive Staff"
          value={String(inactiveEmployees.length)}
          hint="Past / inactive team members"
        />
        <Stat
          label="Total Archived"
          value={String(archivedClients.length + inactiveEmployees.length)}
          hint="Safely kept in database"
        />
        <Stat
          label="Database State"
          value="Preserved"
          hint="No relational history lost"
          tone="good"
        />
      </div>

      <ArchiveClient clients={archivedClients} employees={inactiveEmployees} />
    </>
  );
}
