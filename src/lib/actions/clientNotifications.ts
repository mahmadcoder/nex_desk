"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Marking a client's own notifications read.
 *
 * Every one of these re-derives the client from the session and scopes the
 * update to their id. Taking a client id from the caller would let any portal
 * login clear — and by implication read the existence of — another client's
 * notifications.
 */

async function currentClientId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await createAdminClient()
    .from("clients")
    .select("id")
    .eq("email", user.email!)
    .maybeSingle();

  return data?.id ?? null;
}

export async function markClientNotificationRead(id: string) {
  const clientId = await currentClientId();
  if (!clientId) return { ok: false as const, error: "Please sign in again." };

  const { error } = await createAdminClient()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("audience", "client")
    // The scope that matters — without it any id could be cleared.
    .eq("client_id", clientId);

  if (error) return { ok: false as const, error: "Could not update that." };

  revalidatePath("/portal/notifications");
  revalidatePath("/portal");
  return { ok: true as const };
}

export async function markAllClientNotificationsRead() {
  const clientId = await currentClientId();
  if (!clientId) return { ok: false as const, error: "Please sign in again." };

  const { error } = await createAdminClient()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("audience", "client")
    .eq("client_id", clientId)
    .is("read_at", null);

  if (error) return { ok: false as const, error: "Could not update those." };

  revalidatePath("/portal/notifications");
  revalidatePath("/portal");
  return { ok: true as const };
}
