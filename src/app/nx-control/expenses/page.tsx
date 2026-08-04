import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import AgencyExpensesClient from "@/components/admin/AgencyExpensesClient";

export const metadata = { title: "Agency Expenses" };
export const dynamic = "force-dynamic";

/**
 * What the agency spends on itself.
 *
 * Owner/admin only: this is the cost side of the business, and the staff view
 * is deliberately money-free everywhere else.
 */
export default async function AgencyExpensesPage() {
  const me = await getCurrentStaff();
  if (!me?.isPrivileged) return null;

  const db = createAdminClient();
  const { data, error } = await db
    .from("agency_expenses")
    .select("*")
    .order("incurred_on", { ascending: false });

  // Before the 2027-14 migration this errors and returns null, which would
  // render as "nothing recorded" rather than as the broken thing it is.
  if (error) {
    console.error("Failed to load agency expenses", error);
  }

  return <AgencyExpensesClient expenses={data ?? []} />;
}
