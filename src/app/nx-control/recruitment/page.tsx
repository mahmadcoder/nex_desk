import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { PageHead } from "@/components/admin/ui";
import RecruitmentClient from "@/components/admin/RecruitmentClient";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = { title: "Recruitment" };
export const dynamic = "force-dynamic";

/**
 * Hiring, from application through to an employee record.
 *
 * Owner/admin only: an applicant's expected salary and the notes taken during
 * screening are not the rest of the team's business.
 */
export default async function RecruitmentPage() {
  await requireOwnerAdmin();
  const db = createAdminClient();

  const [{ data: applicants, error }, { data: departments }] = await Promise.all([
    db.from("applicants").select("*").order("created_at", { ascending: false }),
    db.from("departments").select("id, name").order("name"),
  ]);

  if (error?.code === "42P01") {
    return (
      <>
        <PageHead title="Recruitment" sub="Not set up yet." />
        <p className="card p-8 text-center text-sm text-bone-300">
          Run <code className="text-lime-400">supabase/idempotent_fixes_2027_30.sql</code> to
          create the applicants table.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Recruitment"
        sub="Applications through to an offer. Hiring from the Offer column is what creates the employee record."
      />
      <RecruitmentClient applicants={applicants ?? []} departments={departments ?? []} />
    </>
  );
}
