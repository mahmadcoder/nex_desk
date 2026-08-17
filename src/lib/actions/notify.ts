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
  | "staff.late"
  // addressed to one employee
  | "task.assigned"
  | "leave.decided"
  | "salary.paid"
  | "expense.renewal"
  | "client.return_request"
  // raised by the daily cron, 14 days after handover
  | "feedback.due"
  // an employee changed or asked to remove their own profile photo
  | "profile.photo"
  // somebody submitted the public contact form
  | "lead.new"
  // a meeting was booked, moved or cancelled
  | "meeting.scheduled"
  // a client wrote in a project thread
  | "message.received"
  // ---- addressed to a client, in their portal ----
  | "project.progress"
  | "project.delivered"
  | "invoice.paid"
  | "file.shared"
  | "meeting.reminder"
  // ---- support tickets ----
  | "ticket.raised"
  | "ticket.replied"
  | "ticket.resolved";

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
  /**
   * Who reads this. Explicit rather than derived, so a client notification is
   * always deliberate — deriving "client" from the presence of clientId would
   * silently re-address the dozens of admin notifications that already carry a
   * clientId for context.
   */
  audience?: "admins" | "employee" | "client";
  meta?: Record<string, any>;
}): Promise<void> {
  try {
    const db = createAdminClient();
    const audience = n.audience ?? (n.employeeId ? "employee" : "admins");

    // 5-minute debouncing: check if an unread notification with identical subject exists
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    let checkQuery = db
      .from("notifications")
      .select("id")
      .eq("audience", audience)
      .eq("kind", n.kind)
      .eq("title", n.title)
      .is("read_at", null)
      .gte("created_at", fiveMinAgo);

    if (n.employeeId) checkQuery = checkQuery.eq("employee_id", n.employeeId);
    if (n.clientId) checkQuery = checkQuery.eq("client_id", n.clientId);
    if (n.entityId) checkQuery = checkQuery.eq("entity_id", n.entityId);

    const { data: existing } = await checkQuery.limit(1).maybeSingle();

    if (existing) {
      // Update the existing notification rather than inserting duplicate records
      await db
        .from("notifications")
        .update({
          body: n.body ?? null,
          created_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      return;
    }

    const { error } = await db.from("notifications").insert({
      audience,
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
