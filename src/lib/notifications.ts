import { createAdminClient } from "@/lib/supabase/server";
import type { CurrentStaff } from "@/lib/auth/staff";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Reading notifications.
 *
 * Not server actions — every caller is already a guarded page or layout, the
 * same reasoning as `lib/insights.ts`.
 */

/**
 * Which rows this person is allowed to see.
 *
 * Owner/admin see the shared 'admins' stream plus anything addressed to them
 * personally. Staff see ONLY their own — the client event stream is management
 * information and would leak billing context into a view that is deliberately
 * money-free everywhere else.
 */
function scope(query: any, me: CurrentStaff) {
  if (me.isPrivileged) {
    return me.employeeId
      ? query.or(`audience.eq.admins,employee_id.eq.${me.employeeId}`)
      : query.eq("audience", "admins");
  }
  // Fails closed: a staff login with no employee row matches nothing.
  return query.eq("employee_id", me.employeeId ?? "00000000-0000-0000-0000-000000000000");
}

/**
 * The badge number.
 *
 * Runs on EVERY admin page load, so it must never be able to break one. A
 * missing migration returns 0 and logs — it does not white-screen the panel.
 */
export async function unreadNotificationCount(me: CurrentStaff | null): Promise<number> {
  if (!me) return 0;

  try {
    const db = createAdminClient();
    const q = scope(
      db.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
      me
    );

    const { count, error } = await q;
    if (error) {
      console.error(
        error.code === "42P01"
          ? "notifications: table missing — run supabase/idempotent_fixes_2027_11.sql"
          : "notifications: unread count failed",
        error
      );
      return 0;
    }
    return count ?? 0;
  } catch (e) {
    console.error("notifications: unread count threw", e);
    return 0;
  }
}

export async function listNotifications(
  me: CurrentStaff,
  opts: { read?: boolean; limit?: number } = {}
) {
  try {
    const db = createAdminClient();
    let q = db
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 100);

    q = opts.read ? q.not("read_at", "is", null) : q.is("read_at", null);

    const { data, error } = await scope(q, me);
    if (error) {
      console.error("notifications: list failed", error);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.error("notifications: list threw", e);
    return [];
  }
}

/** Counts for the two tabs, in one pass each. */
export async function notificationCounts(me: CurrentStaff) {
  try {
    const db = createAdminClient();
    const [unread, read] = await Promise.all([
      scope(db.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null), me),
      scope(db.from("notifications").select("id", { count: "exact", head: true }).not("read_at", "is", null), me),
    ]);
    return { unread: unread.count ?? 0, read: read.count ?? 0 };
  } catch {
    return { unread: 0, read: 0 };
  }
}
