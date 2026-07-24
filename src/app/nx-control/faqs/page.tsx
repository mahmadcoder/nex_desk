import { createAdminClient } from "@/lib/supabase/server";
import FaqsClient from "@/components/admin/FaqsClient";

export const dynamic = "force-dynamic";

export default async function FaqsPage() {
  const db = createAdminClient();
  const { data: faqs } = await db
    .from("faqs")
    .select("*")
    .order("sort_order", { ascending: true });

  return <FaqsClient faqs={faqs ?? []} />;
}
