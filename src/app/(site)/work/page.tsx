import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CTA from "@/components/site/CTA";
import WorkClient from "@/components/site/WorkClient";
import { demoCases } from "@/lib/agencyData";

export const metadata: Metadata = { title: "Work" };

export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function WorkPage() {
  const supabase = await createClient();
  const { data: dbCases } = await supabase
    .from("case_studies")
    .select("slug,title,client_name,industry,cover_url,outcome,metrics,tech_stack")
    .eq("is_published", true)
    .order("sort_order");

  // Use real case studies if available; otherwise show active demo cases.
  const cases: any[] = dbCases?.length ? dbCases : demoCases.filter((c) => (c as any).is_published !== false);

  return (
    <>
      <WorkClient cases={cases} />
      <CTA />
    </>
  );
}
