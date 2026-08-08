import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { PageHead } from "@/components/admin/ui";
import { listDepartments } from "@/lib/actions/hr";
import { DepartmentsPanel, HolidaysPanel } from "@/components/admin/HrClient";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "HR" };
export const dynamic = "force-dynamic";

/**
 * Org structure: who sits where, and which days nobody works.
 *
 * Owner/admin only. Departments are for grouping and reporting — every access
 * guard in the app reads `profiles.role`, and none of them read this.
 */
export default async function HrPage() {
  await requireOwnerAdmin();
  const db = createAdminClient();

  const [departments, { data: employees }, { data: holidays, error }] = await Promise.all([
    listDepartments(),
    db
      .from("employees")
      .select("id, full_name")
      .neq("status", "Terminated")
      .order("full_name"),
    // Only from the start of last year — a holiday list going back to launch is
    // history nobody reads.
    db
      .from("holidays")
      .select("*")
      .gte("holiday_on", `${new Date().getFullYear() - 1}-01-01`)
      .order("holiday_on", { ascending: false }),
  ]);

  if (error?.code === "42P01") {
    return (
      <>
        <PageHead title="HR" sub="Not set up yet." />
        <p className="card p-8 text-center text-sm text-bone-300">
          Run <code className="text-lime-400">supabase/idempotent_fixes_2027_30.sql</code> to
          create the departments, holidays and applicants tables.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="HR"
        sub="Departments and the public holidays attendance respects."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DepartmentsPanel departments={departments} employees={employees ?? []} />
        <HolidaysPanel holidays={holidays ?? []} />
      </div>
    </>
  );
}
