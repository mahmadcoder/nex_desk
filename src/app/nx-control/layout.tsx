import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/admin/Sidebar";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;

export const metadata = { title: "Control", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, role").eq("id", user.id).single()
    : { data: null };

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="admin flex min-h-screen bg-ink-900">
      <Sidebar base={BASE} user={{ name: profile?.full_name ?? user.email!, role: profile?.role ?? "staff" }} />
      <div className="min-w-0 flex-1 p-4 pt-[calc(3.5rem+1rem)] lg:p-8 lg:pt-8">{children}</div>
    </div>
  );
}
