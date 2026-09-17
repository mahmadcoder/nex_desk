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

export type NotificationCategory = "client" | "staff" | "system";

export const CLIENT_NOTIFICATION_KINDS = new Set([
  "agreement.accepted",
  "milestone.approved",
  "milestone.revision",
  "kickoff.item",
  "kickoff.complete",
  "change_request.raised",
  "document.uploaded",
  "payment.proof_uploaded",
  "client.password_changed",
  "client.return_request",
  "invoice.paid",
  "ticket.raised",
  "ticket.replied",
  "ticket.resolved",
  "message.received",
]);

export const STAFF_NOTIFICATION_KINDS = new Set([
  "worklog.submitted",
  "leave.requested",
  "leave.decided",
  "staff.late",
  "offer.accepted",
  "staff.promoted",
  "task.assigned",
  "salary.paid",
  "meeting.scheduled",
  "profile.photo",
]);

export function getNotificationCategory(n: {
  actor_kind?: string | null;
  kind?: string | null;
}): NotificationCategory {
  if (n.actor_kind === "client") return "client";
  if (n.actor_kind === "staff") return "staff";
  if (n.kind && CLIENT_NOTIFICATION_KINDS.has(n.kind)) return "client";
  if (n.kind && STAFF_NOTIFICATION_KINDS.has(n.kind)) return "staff";
  return "system";
}

export type SourceCounts = {
  all: number;
  client: number;
  staff: number;
  system: number;
};

export type NotificationCounts = {
  unread: SourceCounts;
  read: SourceCounts;
};

export async function listNotifications(
  me: CurrentStaff,
  opts: { read?: boolean; limit?: number; category?: "all" | "client" | "staff" | "system" } = {}
) {
  try {
    const db = createAdminClient();
    let q = db
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 200);

    q = opts.read ? q.not("read_at", "is", null) : q.is("read_at", null);

    const { data, error } = await scope(q, me);
    if (error) {
      console.error("notifications: list failed", error);
      return [];
    }

    let rows = ((data as any[]) ?? []).map((n: any) => ({
      ...n,
      category: getNotificationCategory(n),
    }));

    if (opts.category && opts.category !== "all") {
      rows = rows.filter((r) => r.category === opts.category);
    }

    return rows;
  } catch (e) {
    console.error("notifications: list threw", e);
    return [];
  }
}

/** Counts for unread & read across all categories. */
export async function notificationCategoryCounts(me: CurrentStaff): Promise<NotificationCounts> {
  const defaultCounts: NotificationCounts = {
    unread: { all: 0, client: 0, staff: 0, system: 0 },
    read: { all: 0, client: 0, staff: 0, system: 0 },
  };

  try {
    const db = createAdminClient();
    const { data: rows, error } = await scope(
      db.from("notifications").select("id, kind, actor_kind, read_at"),
      me
    );

    if (error || !rows) return defaultCounts;

    const res: NotificationCounts = {
      unread: { all: 0, client: 0, staff: 0, system: 0 },
      read: { all: 0, client: 0, staff: 0, system: 0 },
    };

    for (const r of rows as any[]) {
      const state = r.read_at ? "read" : "unread";
      const cat = getNotificationCategory(r);
      res[state].all++;
      res[state][cat]++;
    }

    return res;
  } catch (e) {
    console.error("notificationCategoryCounts threw", e);
    return defaultCounts;
  }
}

/** Backward-compatible counts for tabs and sidebar. */
export async function notificationCounts(me: CurrentStaff) {
  const counts = await notificationCategoryCounts(me);
  return {
    unread: counts.unread.all,
    read: counts.read.all,
    detailed: counts,
  };
}

/**
 * Leads nobody has triaged yet, for the sidebar badge.
 *
 * Owner/admin only — staff cannot reach `/leads` at all, so counting for them
 * would badge a link they do not have. Fails to 0 like the count above: a
 * badge is not worth taking the panel down for.
 */
export async function newLeadCount(me: CurrentStaff | null): Promise<number> {
  if (!me?.isPrivileged) return 0;

  try {
    const { count, error } = await createAdminClient()
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");

    if (error) {
      console.error("leads: new count failed", error);
      return 0;
    }
    return count ?? 0;
  } catch (e) {
    console.error("leads: new count failed", e);
    return 0;
  }
}

/* ============================================================
   CLIENT SIDE
   ============================================================ */

/**
 * The portal bell.
 *
 * Deliberately NOT routed through `scope()` above: that function answers "which
 * staff stream is this?" and client rows must never appear in it. Keeping them
 * apart is what stops a client notification leaking into the admin panel and,
 * more importantly, one client's into another's.
 *
 * Runs on every portal page load, so like its staff counterpart it returns 0
 * rather than breaking the page when the migration has not been run.
 */
export async function unreadClientCount(clientId: string | null): Promise<number> {
  if (!clientId) return 0;

  try {
    const { count, error } = await createAdminClient()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("audience", "client")
      .eq("client_id", clientId)
      .is("read_at", null);

    if (error) {
      console.error(
        error.code === "42P01"
          ? "notifications: table missing — run supabase/idempotent_fixes_2027_11.sql"
          : "notifications: client count failed",
        error
      );
      return 0;
    }
    return count ?? 0;
  } catch (e) {
    console.error("unreadClientCount failed:", e);
    return 0;
  }
}

export async function listClientNotifications(
  clientId: string | null,
  opts: { read?: boolean; limit?: number } = {}
) {
  if (!clientId) return [];

  try {
    let q = createAdminClient()
      .from("notifications")
      .select("*")
      .eq("audience", "client")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 100);

    q = opts.read ? q.not("read_at", "is", null) : q.is("read_at", null);

    const { data, error } = await q;
    if (error) {
      console.error("notifications: client list failed", error);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.error("listClientNotifications failed:", e);
    return [];
  }
}
