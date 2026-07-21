import { createAdminClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/admin/ui";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const db = createAdminClient();
  const { data: settings } = await db.from("settings").select("*").eq("id", 1).single();
  const { data: staff } = await db.from("profiles")
    .select("id, full_name, email, role, is_active")
    .in("role", ["owner", "admin", "staff"]);

  return (
    <>
      <PageHead title="Settings" sub="Company details, bank info and defaults used across every document." />
      <SettingsForm settings={settings} staff={staff ?? []} />
    </>
  );
}
