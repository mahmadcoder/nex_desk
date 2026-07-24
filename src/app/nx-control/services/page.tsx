import { createAdminClient } from "@/lib/supabase/server";
import ServicesClient from "@/components/admin/ServicesClient";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const db = createAdminClient();
  const { data: services } = await db
    .from("services")
    .select("*")
    .order("sort_order", { ascending: true });

  return <ServicesClient services={services ?? []} />;
}
