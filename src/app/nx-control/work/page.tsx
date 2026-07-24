import { createAdminClient } from "@/lib/supabase/server";
import WorkClient from "@/components/admin/WorkClient";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const db = createAdminClient();
  const { data: cases } = await db
    .from("case_studies")
    .select("*")
    .order("sort_order", { ascending: true });

  return <WorkClient caseStudies={cases ?? []} />;
}
