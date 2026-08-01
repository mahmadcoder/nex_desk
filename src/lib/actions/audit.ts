"use server";

import { createAdminClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The one way to write an audit row.
 *
 * Two things this gets right that a direct insert does not:
 *
 *  1. `audit_log.actor_id` is a foreign key to `profiles`. A session
 *     authenticated purely through `user_metadata` may have no profiles row,
 *     and a dangling id fails the insert with 23503 — which, thrown from a
 *     server action, surfaces as a bare 500 with no message.
 *
 *  2. **Recording that something happened must never stop it happening.** A
 *     failed audit write is logged and swallowed: losing a history entry is a
 *     nuisance, losing the payment or the handover it describes is not.
 */
export async function recordAudit(
  actorId: string | null | undefined,
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Record<string, any>,
  ip?: string | null
) {
  try {
    const db = createAdminClient();

    let actor: string | null = null;
    if (actorId) {
      const { data } = await db
        .from("profiles").select("id").eq("id", actorId).maybeSingle();
      actor = data?.id ?? null;
    }

    const { error } = await db.from("audit_log").insert({
      actor_id: actor,
      action,
      entity,
      entity_id: entityId ?? null,
      meta: meta ?? {},
      ...(ip ? { ip } : {}),
    });

    if (error) console.error("Audit write failed:", action, error.message);
  } catch (e) {
    console.error("Audit write threw:", action, e);
  }
}
