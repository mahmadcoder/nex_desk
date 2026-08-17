"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/actions/audit";
import { notify } from "@/lib/actions/notify";
import { getCurrentStaff } from "@/lib/auth/staff";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * Per-project conversation.
 *
 * The `messages` table has existed since the beginning with nothing using it,
 * so every conversation lived in email or WhatsApp — where it is attached to a
 * phone number rather than to the project, and where nobody joining later can
 * find it.
 *
 * A client has no `profiles` row, so `sender_id` alone cannot say who wrote
 * something. `sender_kind` and `sender_name` carry that instead.
 */

const MAX = 4000;

import { notifyClientGrouped } from "@/lib/actions/notifyClient";

export async function postStaffMessage(projectId: string, body: string) {
  const me = await requireStaff();
  const text = body.trim();
  if (!text) return { ok: false as const, error: "Write something first." };
  if (text.length > MAX) return { ok: false as const, error: "That is too long to send." };

  const db = createAdminClient();
  const staff = await getCurrentStaff();

  const { error } = await db.from("messages").insert({
    project_id: projectId,
    sender_id: me.userId,
    sender_kind: "staff",
    sender_name: staff?.fullName ?? "Nex Desk",
    body: text,
    // A message we send is not unread on our side.
    read_at: new Date().toISOString(),
  });

  if (error) return { ok: false as const, error: error.message };

  await recordAudit(me.userId, "message.post", "projects", projectId, { chars: text.length });

  // Look up project client to send in-app notification to client portal
  const { data: project } = await db
    .from("projects")
    .select("name, client_id")
    .eq("id", projectId)
    .maybeSingle();

  if (project?.client_id) {
    await notifyClientGrouped({
      clientId: project.client_id,
      kind: "message.received",
      title: (count) =>
        count === 1
          ? `New message on ${project.name}`
          : `${count} new messages on ${project.name}`,
      body: text.slice(0, 140),
      href: `/portal/projects/${projectId}?tab=messages`,
      entityId: projectId,
    });
  }

  revalidatePath(`/${ADMIN}/projects/${projectId}`);
  revalidatePath(`/portal/projects/${projectId}`);
  return { ok: true as const };
}

/**
 * A client writing in their own portal.
 *
 * Guarded here rather than trusting the page: the project must belong to the
 * signed-in client, or anyone with a portal login could post into any project
 * by id.
 */
export async function postClientMessage(projectId: string, body: string) {
  const text = body.trim();
  if (!text) return { ok: false as const, error: "Write something first." };
  if (text.length > MAX) return { ok: false as const, error: "That is too long to send." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Please sign in again." };

  const db = createAdminClient();

  const { data: client } = await db
    .from("clients")
    .select("id, name, lifecycle")
    .eq("email", user.email!)
    .maybeSingle();
  if (!client) return { ok: false as const, error: "No client profile on this account." };

  const { data: project } = await db
    .from("projects")
    .select("id, name, client_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.client_id !== client.id) {
    return { ok: false as const, error: "That project is not on your account." };
  }

  // A paused account is read-only everywhere else; it is read-only here too.
  if (String(client.lifecycle ?? "active") !== "active") {
    return { ok: false as const, error: "Your account is paused. Use the return request instead." };
  }

  const { error } = await db.from("messages").insert({
    project_id: projectId,
    sender_id: null,
    sender_kind: "client",
    sender_name: client.name,
    body: text,
  });

  if (error) return { ok: false as const, error: error.message };

  await notify({
    kind: "message.received",
    title: `${client.name} sent a message on ${project.name}`,
    body: text.slice(0, 140),
    href: `/${ADMIN}/projects/${projectId}?tab=messages`,
    entity: "projects",
    entityId: projectId,
    clientId: client.id,
    actorKind: "client",
    actorLabel: client.name,
  });

  revalidatePath(`/${ADMIN}/projects/${projectId}`);
  revalidatePath(`/portal/projects/${projectId}`);
  return { ok: true as const };
}

/** Marks the client's unread messages as seen. Staff-side only. */
export async function markProjectMessagesRead(projectId: string) {
  await requireStaff();
  await createAdminClient()
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("sender_kind", "client")
    .is("read_at", null);
  return { ok: true as const };
}

/** Marks staff messages as read when the client opens the messages tab in the portal. */
export async function markClientMessagesRead(projectId: string) {
  await createAdminClient()
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("sender_kind", "staff")
    .is("read_at", null);
  return { ok: true as const };
}

export async function listMessages(projectId: string) {
  const { data, error } = await createAdminClient()
    .from("messages")
    .select("id, body, sender_kind, sender_name, created_at, read_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    if (error.code !== "42P01" && error.code !== "42703") {
      console.error("listMessages failed", error);
    }
    return [];
  }
  return data ?? [];
}

function describe(error: any) {
  if (error.code === "42P01" || error.code === "42703") {
    return "Messaging needs its columns — run supabase/idempotent_fixes_2027_24.sql.";
  }
  return error.message ?? "Could not send that.";
}
