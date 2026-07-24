import { createClient, createAdminClient } from "@/lib/supabase/server";
import Sidebar from "@/components/admin/Sidebar";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;

export const metadata = { title: "Control", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  const adminDb = createAdminClient();
  const { data: profile } = await adminDb
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", user.id)
    .single();

  const isStaff = !!(profile?.is_active && ["owner", "admin", "staff"].includes(profile.role));

  if (!isStaff) {
    return <>{children}</>;
  }

  return (
    <div className="admin flex min-h-screen bg-ink-900">
      <Sidebar base={BASE} user={{ name: profile?.full_name ?? user.email!, role: profile?.role ?? "staff" }} />
      <div className="min-w-0 flex-1 p-4 pt-[calc(3.5rem+1rem)] lg:p-8 lg:pt-8">{children}</div>
    </div>
  );
}
