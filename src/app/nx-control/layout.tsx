import { getCurrentStaff } from "@/lib/auth/staff";
import Sidebar from "@/components/admin/Sidebar";
import LoginToastListener from "@/components/admin/LoginToastListener";
import CommandPalette from "@/components/admin/CommandPalette";
import { unreadNotificationCount, newLeadCount } from "@/lib/notifications";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;

export const metadata = { title: "Control", robots: { index: false, follow: false } };

// The whole panel is per-user: the layout resolves the signed-in role from
// cookies, so nothing under it can be statically rendered.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // One resolver for the whole app, so the sidebar, the pages and the server
  // actions can never disagree about who you are.
  const me = await getCurrentStaff();

  // Not staff (or the login page) — render bare, the middleware handles redirects.
  if (!me) return <>{children}</>;

  return (
    <div className="admin flex min-h-screen bg-ink-900">
      <LoginToastListener />
      {/* Ctrl+K search, scoped server-side by role. */}
      <CommandPalette />
      {/* The badge is read here rather than inside Sidebar: that component is
          a client component and fetches nothing. `unreadNotificationCount`
          returns 0 on any failure, so a missing migration cannot take the
          whole panel down. */}
      <Sidebar
        base={BASE}
        user={{ name: me.fullName, role: me.role, avatarUrl: me.avatarUrl }}
        counts={{
          "/notifications": await unreadNotificationCount(me),
          // The badge mechanism already existed and only ever carried one key.
          // A new lead is the thing most worth surfacing and had no badge.
          "/leads": await newLeadCount(me),
        }}
      />
      <div className="min-w-0 flex-1 p-4 pt-[calc(3.5rem+1rem)] lg:p-8 lg:pt-8">{children}</div>
    </div>
  );
}
