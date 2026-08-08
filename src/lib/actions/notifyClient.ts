"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { notify, type NotifyKind } from "@/lib/actions/notify";
import { sendEmail } from "@/lib/email/send";
import { getSiteBaseUrl } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Telling a client something.
 *
 * Everything lands in their portal bell. Only a few things are worth an email
 * as well, and that rule lives here rather than being remembered at each of the
 * five call sites — the failure mode otherwise is a client getting seven emails
 * because someone uploaded seven assets, and then filtering us out entirely.
 *
 * Never throws. A notification is a side effect of something more important —
 * a payment, a delivery, a meeting — and failing to file one must never fail
 * the thing it describes.
 */

/** The only kinds that earn an interruption. */
const EMAILABLE: NotifyKind[] = ["invoice.paid", "project.delivered", "meeting.reminder"];

export async function notifyClient(n: {
  clientId: string;
  kind: NotifyKind;
  title: string;
  body?: string | null;
  /** Portal-relative, e.g. `/portal/projects/abc?tab=files`. */
  href?: string | null;
  entity?: string | null;
  entityId?: string | null;
  projectId?: string | null;
  /** Overrides the default rule for this kind. */
  alsoEmail?: boolean;
}): Promise<void> {
  try {
    await notify({
      audience: "client",
      clientId: n.clientId,
      kind: n.kind,
      title: n.title,
      body: n.body ?? null,
      href: n.href ?? "/portal",
      entity: n.entity ?? null,
      entityId: n.entityId ?? null,
      actorKind: "system",
    });

    const shouldEmail = n.alsoEmail ?? EMAILABLE.includes(n.kind);
    if (!shouldEmail) return;

    const { data: client } = await createAdminClient()
      .from("clients")
      .select("name, email")
      .eq("id", n.clientId)
      .maybeSingle();

    if (!client?.email) return;

    await sendEmail({
      templateKey: "client_update",
      to: client.email,
      clientId: n.clientId,
      projectId: n.projectId ?? undefined,
      subjectOverride: n.title,
      vars: {
        client_name: client.name ?? "there",
        headline: n.title,
        detail: n.body ?? "",
        portal_url: `${getSiteBaseUrl()}${n.href ?? "/portal"}`,
      },
    });
  } catch (e) {
    console.error("notifyClient failed:", e);
  }
}

/**
 * The same, but collapses a burst into one entry.
 *
 * Uploading seven assets should leave one line in the bell, not seven. Looks
 * for an unread notification of the same kind for the same project raised
 * inside the window and rewrites it rather than adding another.
 *
 * Returns true when it grouped into an existing row.
 */
export async function notifyClientGrouped(
  n: {
    clientId: string;
    kind: NotifyKind;
    /** Called with the running count to produce the title. */
    title: (count: number) => string;
    body?: string | null;
    href?: string | null;
    entityId?: string | null;
  },
  windowMinutes = 10
): Promise<boolean> {
  try {
    const db = createAdminClient();
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

    const { data: existing } = await db
      .from("notifications")
      .select("id, meta")
      .eq("audience", "client")
      .eq("client_id", n.clientId)
      .eq("kind", n.kind)
      .eq("entity_id", n.entityId ?? "")
      .is("read_at", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const count = Number((existing.meta as any)?.count ?? 1) + 1;
      await db
        .from("notifications")
        .update({
          title: n.title(count),
          body: n.body ?? null,
          meta: { ...((existing.meta as any) ?? {}), count },
          // Float it back to the top: the newest file is the reason to look.
          created_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      return true;
    }

    await notify({
      audience: "client",
      clientId: n.clientId,
      kind: n.kind,
      title: n.title(1),
      body: n.body ?? null,
      href: n.href ?? "/portal",
      entity: "projects",
      entityId: n.entityId ?? null,
      actorKind: "system",
      meta: { count: 1 },
    });
    return false;
  } catch (e) {
    console.error("notifyClientGrouped failed:", e);
    return false;
  }
}
