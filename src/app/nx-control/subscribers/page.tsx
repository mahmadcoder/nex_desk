import { createAdminClient } from "@/lib/supabase/server";
import SubscribersClient from "@/components/admin/SubscribersClient";

export const metadata = { title: "Subscribers & Broadcast" };
export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const db = createAdminClient();
  const { data: subscribers } = await db
    .from("subscribers")
    .select("*")
    .order("created_at", { ascending: false });

  return <SubscribersClient subscribers={subscribers ?? []} />;
}
