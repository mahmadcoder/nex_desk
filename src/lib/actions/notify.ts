"use server";

import { createAdminClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Records something worth knowing about.
 *
 * Deliberately shaped like `recordAudit`: the whole body is wrapped, it
 * returns nothing, and it NEVER throws. A notification is a side effect of
 * something more important — a payment, a handover, a leave request — and
 * failing to file one must never fail the thing it was describing.
 *
 * Adding a new event is one call at the site where it happens.
 *
 * Not an email. `sendEmail` already handles that and keeps its own log; this
 * is the in-app record, which is a different question ("has anyone dealt with
 * this yet?") with a different answer.
 */
export type NotifyKind =
  // client-driven
  | "agreement.accepted"
  | "milestone.approved"
  | "kickoff.item"
  | "kickoff.complete"
  | "change_request.raised"
  | "document.uploaded"
  // staff-driven
  | "worklog.submitted"
  | "leave.requested"
  // addressed to one employee
  | "task.assigned"
  | "leave.decided"
  | "salary.paid"
  | "expense.renewal";

export async function notify(n: {
  kind: NotifyKind;
  title: string;
  body?: string | null;
  href?: string | null;
  entity?: string | null;
  entityId?: string | null;
  actorLabel?: string | null;
  actorKind?: "client" | "staff" | "system";
  clientId?: string | null;
  /** Present ⇒ addressed to that one person. Absent ⇒ every owner/admin. */
  employeeId?: string | null;
  meta?: Record<string, any>;
}): Promise<void> {
  try {
    const db = createAdminClient();

    const { error } = await db.from("notifications").insert({
      audience: n.employeeId ? "employee" : "admins",
      employee_id: n.employeeId ?? null,
      kind: n.kind,
      title: n.title,
      body: n.body ?? null,
      href: n.href ?? null,
      entity: n.entity ?? null,
      entity_id: n.entityId ?? null,
      actor_label: n.actorLabel ?? null,
      actor_kind: n.actorKind ?? "system",
      client_id: n.clientId ?? null,
      meta: n.meta ?? {},
    });

    if (error) {
      // 42P01 = the table is not there yet. Named explicitly so a missing
      // migration reads as a missing migration rather than a mystery.
      console.error(
        error.code === "42P01"
          ? "notify: notifications table missing — run supabase/idempotent_fixes_2027_11.sql"
          : "notify: could not record notification",
        error
      );
    }
  } catch (e) {
    console.error("notify failed:", e);
  }
}
