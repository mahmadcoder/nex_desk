import { Suspense } from "react";
import { getCurrentStaff } from "@/lib/auth/staff";
import { PageHead } from "@/components/admin/ui";
import { listNotifications, notificationCategoryCounts } from "@/lib/notifications";
import NotificationsClient from "@/components/admin/NotificationsClient";

const BASE = `/${process.env.ADMIN_PATH || "nx-control"}`;
export const metadata = { title: "Notifications | NexDesk Admin" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; source?: string; q?: string }>;
}) {
  const me = await getCurrentStaff();
  if (!me) return null;

  const { tab } = await searchParams;
  const showRead = tab === "read";

  const [rows, counts] = await Promise.all([
    listNotifications(me, { read: showRead }),
    notificationCategoryCounts(me),
  ]);

  return (
    <>
      <PageHead
        title="Notifications"
        sub={
          me.isPrivileged
            ? "Unified command center for client actions, team updates, and system events."
            : "Work assigned to you, and decisions on your requests."
        }
      />

      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center rounded-xl border border-ink-800 bg-ink-900/40">
            <div className="text-center">
              <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
              <p className="text-xs text-bone-300">Loading notifications…</p>
            </div>
          </div>
        }
      >
        <NotificationsClient
          key={showRead ? "read" : "unread"}
          initialNotifications={rows}
          counts={counts}
          isPrivileged={me.isPrivileged}
          basePath={BASE}
        />
      </Suspense>
    </>
  );
}
