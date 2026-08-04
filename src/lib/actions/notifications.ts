"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { asUuid } from "@/lib/utils";

const ADMIN = process.env.ADMIN_PATH || "nx-control";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Marking notifications read.
 *
 * The id arrives from the browser and this runs with the service-role key, so
 * every call re-checks the row is actually addressed to the caller — the same
 * ownership proof used in `portal.ts` and `tasks.ts`. Without it, any staff
 * member could clear rows meant for someone else by guessing an id.
 */

/** Both paths that need refreshing: the page, and the sidebar badge above it. */
function refresh() {
  revalidatePath(`/${ADMIN}/notifications`);
  revalidatePath(`/${ADMIN}`, "layout");
}

export async function markNotificationRead(
  notificationId: string,
  read = true
): Promise<Result> {
  const me = await getCurrentStaff();
  if (!me) return { ok: false, error: "Sign in first." };

  const id = asUuid(notificationId);
  if (!id) return { ok: false, error: "Invalid notification reference." };

  const db = createAdminClient();
  const { data: row } = await db
    .from("notifications").select("id, audience, employee_id").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "That notification no longer exists." };

  const mine =
    (row.audience === "admins" && me.isPrivileged) ||
    (row.audience === "employee" && row.employee_id === me.employeeId);
  if (!mine) return { ok: false, error: "That notification is not addressed to you." };

  const { error } = await db.from("notifications").update({
    read_at: read ? new Date().toISOString() : null,
    read_by: read ? me.userId : null,
  }).eq("id", id);

  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true };
}

/** Clears everything currently visible to this person. */
export async function markAllNotificationsRead(): Promise<Result> {
  const me = await getCurrentStaff();
  if (!me) return { ok: false, error: "Sign in first." };

  const db = createAdminClient();
  const stamp = { read_at: new Date().toISOString(), read_by: me.userId };

  // Two narrow updates rather than one `.or()`: an admin who is also an
  // employee has two distinct sets, and each is filtered explicitly so
  // neither can accidentally widen into the other.
  const jobs: Promise<unknown>[] = [];

  if (me.isPrivileged) {
    jobs.push(
      db.from("notifications").update(stamp)
        .eq("audience", "admins").is("read_at", null) as unknown as Promise<unknown>
    );
  }
  if (me.employeeId) {
    jobs.push(
      db.from("notifications").update(stamp)
        .eq("employee_id", me.employeeId).is("read_at", null) as unknown as Promise<unknown>
    );
  }

  if (!jobs.length) return { ok: true };

  try {
    await Promise.all(jobs);
  } catch (e) {
    console.error("markAllNotificationsRead failed:", e);
    return { ok: false, error: "Could not clear those. Try again." };
  }

  refresh();
  return { ok: true };
}
