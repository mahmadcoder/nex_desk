"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireStaff, requireOwnerAdmin } from "@/lib/auth/guards";
import { getCurrentStaff, assignedClientIds } from "@/lib/auth/staff";
import { recordAudit } from "@/lib/actions/audit";
import { notify } from "@/lib/actions/notify";
import { notifyClient } from "@/lib/actions/notifyClient";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";
const MAX = 6000;

/**
 * Support tickets.
 *
 * The last module with nothing behind it. A client with a problem had email or
 * WhatsApp: both lose the thread, neither has an owner, and neither can answer
 * "how long did we take".
 *
 * SLA timestamps are stamped ONCE and never rewritten. Reopening a ticket must
 * not erase how long the first reply took, because that is the number the whole
 * table exists to produce.
 */

function describe(error: any) {
  if (error?.code === "42P01") {
    return "Tickets need their tables — run supabase/idempotent_fixes_2027_32.sql.";
  }
  return error?.message ?? "Something went wrong.";
}

/** The signed-in client, or null. Never accepts an id from the caller. */
async function currentClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await createAdminClient()
    .from("clients")
    .select("id, name, lifecycle")
    .eq("email", user.email!)
    .maybeSingle();

  return data ?? null;
}

/* ============================================================
   RAISING
   ============================================================ */

/** A client raising a ticket from their portal. */
export async function raiseTicket(input: {
  subject: string;
  body: string;
  priority?: string;
  projectId?: string | null;
}) {
  const client = await currentClient();
  if (!client) return { ok: false as const, error: "Please sign in again." };

  const subject = input.subject?.trim();
  const body = input.body?.trim();
  if (!subject) return { ok: false as const, error: "Give it a one-line summary." };
  if (!body) return { ok: false as const, error: "Tell us what is happening." };
  if (body.length > MAX) return { ok: false as const, error: "That is too long — attach a file instead." };

  const db = createAdminClient();

  // A project id from the browser is not trusted: it must belong to this
  // client, or a ticket could be filed against somebody else's work.
  let projectId: string | null = null;
  if (input.projectId) {
    const { data: p } = await db
      .from("projects")
      .select("id, client_id")
      .eq("id", input.projectId)
      .maybeSingle();
    if (p && p.client_id === client.id) projectId = p.id;
  }

  const { data: ticket, error } = await db
    .from("tickets")
    .insert({
      client_id: client.id,
      project_id: projectId,
      subject,
      body,
      // A client choosing "urgent" for everything is a known failure mode, so
      // this is a starting point that staff can change — not a promise.
      priority: ["low", "normal", "high", "urgent"].includes(input.priority ?? "")
        ? input.priority
        : "normal",
      raised_by_kind: "client",
      raised_by_name: client.name,
    })
    .select("id, subject, priority")
    .single();

  if (error) return { ok: false as const, error: describe(error) };

  await notify({
    kind: "ticket.raised",
    title: `${client.name}: ${subject}`,
    body: body.slice(0, 160),
    href: `/${ADMIN}/tickets/${ticket.id}`,
    entity: "tickets",
    entityId: ticket.id,
    clientId: client.id,
    actorKind: "client",
    actorLabel: client.name,
  });

  revalidatePath(`/${ADMIN}/tickets`);
  revalidatePath("/portal/support");
  return { ok: true as const, id: ticket.id };
}

/** Staff raising one on a client's behalf — a call, a WhatsApp, a bug we found. */
export async function raiseTicketForClient(input: {
  clientId: string;
  subject: string;
  body: string;
  priority?: string;
  projectId?: string | null;
}) {
  const me = await requireStaff();
  const staff = await getCurrentStaff();

  if (!input.subject?.trim()) return { ok: false as const, error: "Give it a subject." };
  if (!input.body?.trim()) return { ok: false as const, error: "Describe the problem." };

  const { data: ticket, error } = await createAdminClient()
    .from("tickets")
    .insert({
      client_id: input.clientId,
      project_id: input.projectId || null,
      subject: input.subject.trim(),
      body: input.body.trim(),
      priority: input.priority || "normal",
      raised_by_kind: "staff",
      raised_by_name: staff?.fullName ?? "Nex Desk",
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: describe(error) };

  await recordAudit(me.userId, "ticket.create", "tickets", ticket.id, { subject: input.subject });
  revalidatePath(`/${ADMIN}/tickets`);
  return { ok: true as const, id: ticket.id };
}

/* ============================================================
   REPLYING
   ============================================================ */

export async function replyToTicket(
  ticketId: string,
  body: string,
  opts: { internal?: boolean } = {}
) {
  const me = await requireStaff();
  const staff = await getCurrentStaff();
  const text = body?.trim();
  if (!text) return { ok: false as const, error: "Write something first." };

  const db = createAdminClient();
  const { data: ticket } = await db
    .from("tickets")
    .select("id, subject, client_id, first_response_at, status")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return { ok: false as const, error: "That ticket no longer exists." };

  const { error } = await db.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_kind: "staff",
    sender_id: me.userId,
    sender_name: staff?.fullName ?? "Nex Desk",
    body: text,
    is_internal: !!opts.internal,
  });
  if (error) return { ok: false as const, error: describe(error) };

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };

  // First response is stamped once, by the first reply the CLIENT can actually
  // see. An internal note is us talking to ourselves, and counting it would
  // make the response-time figure flattering and useless.
  if (!ticket.first_response_at && !opts.internal) {
    patch.first_response_at = new Date().toISOString();
  }
  if (!opts.internal && ticket.status === "open") patch.status = "in_progress";

  await db.from("tickets").update(patch).eq("id", ticketId);

  if (!opts.internal) {
    await notifyClient({
      clientId: ticket.client_id,
      kind: "ticket.replied",
      title: `We replied — ${ticket.subject}`,
      body: text.slice(0, 160),
      href: `/portal/support/${ticketId}`,
      entity: "tickets",
      entityId: ticketId,
    });
  }

  revalidatePath(`/${ADMIN}/tickets/${ticketId}`);
  revalidatePath(`/portal/support/${ticketId}`);
  return { ok: true as const };
}

/** A client replying in their own portal. */
export async function clientReplyToTicket(ticketId: string, body: string) {
  const client = await currentClient();
  if (!client) return { ok: false as const, error: "Please sign in again." };

  const text = body?.trim();
  if (!text) return { ok: false as const, error: "Write something first." };

  const db = createAdminClient();
  const { data: ticket } = await db
    .from("tickets")
    .select("id, subject, client_id, status")
    .eq("id", ticketId)
    .maybeSingle();

  // Ownership re-derived, never trusted: otherwise any portal login could reply
  // into any ticket by id.
  if (!ticket || ticket.client_id !== client.id) {
    return { ok: false as const, error: "That ticket is not on your account." };
  }

  const { error } = await db.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_kind: "client",
    sender_name: client.name,
    body: text,
  });
  if (error) return { ok: false as const, error: describe(error) };

  // A client replying to something we called resolved is reopening it. Leaving
  // it resolved is how a complaint gets quietly filed away.
  const reopened = ["resolved", "closed"].includes(ticket.status);
  await db
    .from("tickets")
    .update({
      status: reopened ? "open" : ticket.status === "waiting_client" ? "in_progress" : ticket.status,
      ...(reopened ? { resolved_at: null, closed_at: null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  await notify({
    kind: "ticket.replied",
    title: `${client.name} replied — ${ticket.subject}`,
    body: text.slice(0, 160),
    href: `/${ADMIN}/tickets/${ticketId}`,
    entity: "tickets",
    entityId: ticketId,
    clientId: client.id,
    actorKind: "client",
    actorLabel: client.name,
  });

  revalidatePath(`/${ADMIN}/tickets/${ticketId}`);
  revalidatePath(`/portal/support/${ticketId}`);
  return { ok: true as const, reopened };
}

/* ============================================================
   TRIAGE
   ============================================================ */

export async function setTicketStatus(ticketId: string, status: string) {
  const me = await requireStaff();
  const allowed = ["open", "in_progress", "waiting_client", "resolved", "closed"];
  if (!allowed.includes(status)) return { ok: false as const, error: "Unknown status." };

  const db = createAdminClient();
  const { data: before } = await db
    .from("tickets")
    .select("id, subject, client_id, resolved_at, closed_at")
    .eq("id", ticketId)
    .maybeSingle();
  if (!before) return { ok: false as const, error: "That ticket no longer exists." };

  const patch: Record<string, any> = { status, updated_at: new Date().toISOString() };

  // Stamped on the FIRST time each happens. Re-resolving a reopened ticket
  // must not overwrite the original figure, or every SLA report flatters us.
  if (status === "resolved" && !before.resolved_at) patch.resolved_at = new Date().toISOString();
  if (status === "closed" && !before.closed_at) patch.closed_at = new Date().toISOString();

  const { error } = await db.from("tickets").update(patch).eq("id", ticketId);
  if (error) return { ok: false as const, error: describe(error) };

  if (status === "resolved") {
    await notifyClient({
      clientId: before.client_id,
      kind: "ticket.resolved",
      title: `Resolved — ${before.subject}`,
      body: "If this is not fixed, reply on the ticket and it reopens automatically.",
      href: `/portal/support/${ticketId}`,
      entity: "tickets",
      entityId: ticketId,
    });
  }

  await recordAudit(me.userId, "ticket.status", "tickets", ticketId, { status });
  revalidatePath(`/${ADMIN}/tickets`);
  revalidatePath(`/${ADMIN}/tickets/${ticketId}`);
  revalidatePath(`/portal/support/${ticketId}`);
  return { ok: true as const };
}

export async function assignTicket(ticketId: string, employeeId: string | null) {
  const me = await requireOwnerAdmin();

  const { data, error } = await createAdminClient()
    .from("tickets")
    .update({ assigned_employee_id: employeeId, updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .select("subject")
    .single();

  if (error) return { ok: false as const, error: describe(error) };

  if (employeeId) {
    await notify({
      kind: "ticket.raised",
      title: `Assigned to you — ${data.subject}`,
      href: `/${ADMIN}/tickets/${ticketId}`,
      entity: "tickets",
      entityId: ticketId,
      employeeId,
    });
  }

  await recordAudit(me.userId, "ticket.assign", "tickets", ticketId, { employeeId });
  revalidatePath(`/${ADMIN}/tickets`);
  revalidatePath(`/${ADMIN}/tickets/${ticketId}`);
  return { ok: true as const };
}

export async function setTicketPriority(ticketId: string, priority: string) {
  const me = await requireStaff();
  if (!["low", "normal", "high", "urgent"].includes(priority)) {
    return { ok: false as const, error: "Unknown priority." };
  }

  const { error } = await createAdminClient()
    .from("tickets")
    .update({ priority, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { ok: false as const, error: describe(error) };

  await recordAudit(me.userId, "ticket.priority", "tickets", ticketId, { priority });
  revalidatePath(`/${ADMIN}/tickets/${ticketId}`);
  return { ok: true as const };
}

/* ============================================================
   READING
   ============================================================ */

/** The thread. `clientView` strips internal notes. */
export async function ticketMessages(ticketId: string, { clientView = false } = {}) {
  let q = createAdminClient()
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at");

  if (clientView) q = q.eq("is_internal", false);

  const { data, error } = await q;
  if (error) {
    if (error.code !== "42P01") console.error("ticketMessages failed", error);
    return [];
  }
  return data ?? [];
}

/** Tickets a staff member may see: theirs if not privileged, all if they are. */
export async function visibleTickets() {
  const me = await getCurrentStaff();
  if (!me) return [];

  const db = createAdminClient();
  let q = db
    .from("tickets")
    .select("*, clients(id, name, company), projects(id, name), employees(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!me.isPrivileged) {
    // Fails closed: no assignments means no tickets, never everything.
    const ids = await assignedClientIds(me.employeeId);
    q = q.in("client_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data, error } = await q;
  if (error) {
    if (error.code !== "42P01") console.error("visibleTickets failed", error);
    return [];
  }
  return data ?? [];
}
