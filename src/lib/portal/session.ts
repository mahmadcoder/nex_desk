import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Who is looking at the portal, and what they are allowed to see.
 *
 * This used to live inline at the top of the single 714-line portal page. Now
 * that the portal is five routes, resolving it once here is what stops each of
 * them re-deriving the same auth → client → permissions chain — and, more
 * importantly, what stops one of them getting the rules subtly wrong.
 */

export type PortalPerms = {
  show_financials: boolean;
  show_invoices: boolean;
  show_milestones: boolean;
  show_files: boolean;
  show_staging: boolean;
};

export type PortalSession = {
  client: any;
  /**
   * A paused account keeps its portal — every invoice and document a client may
   * need years later stays reachable — but goes read-only.
   */
  isPaused: boolean;
  perms: PortalPerms;
};

const DEFAULT_PERMS: PortalPerms = {
  show_financials: true,
  show_invoices: true,
  show_milestones: true,
  show_files: true,
  show_staging: true,
};

/**
 * Resolves the signed-in client, or redirects.
 *
 * Returns `null` for a signed-in user with no client row, so the caller can
 * render the "no project profile" card rather than bounce them to a login they
 * have already passed.
 */
export async function getPortalSession(): Promise<PortalSession | null> {
  const session = await getPortalSessionOptional();
  if (!session) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/portal/login");
    // Client is authenticated in Supabase but their account was soft-deleted/archived
    await supabase.auth.signOut();
    redirect("/portal/login?deactivated=1");
  }
  return session;
}

/**
 * The same lookup, but never redirects.
 *
 * The layout needs this: it wraps `/portal/login` too, so a version that
 * bounced signed-out visitors to the login page would bounce the login page to
 * itself, forever. Catching the redirect instead would mean swallowing Next's
 * control-flow exception — which works by accident and breaks the first time
 * a real redirect needs to pass through here.
 */
export async function getPortalSessionOptional(): Promise<PortalSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const db = createAdminClient();
  const { data: client } = await db
    .from("clients")
    .select("*")
    .eq("email", user.email!)
    .maybeSingle();

  if (!client) return null;

  // Block access if client has been soft-deleted / archived or marked inactive
  if (
    client.lifecycle === "archived" ||
    client.status === "inactive" ||
    client.is_active === false
  ) {
    return null;
  }

  return {
    client,
    isPaused: String(client.lifecycle ?? "active") === "paused",
    perms: {
      ...DEFAULT_PERMS,
      ...((client.client_permissions as Record<string, boolean>) || {}),
    },
  };
}

/**
 * Same, but refuses a route the client is not permitted to see.
 *
 * Hiding a nav link is decoration; this is the control. A client who types
 * `/portal/invoices` with `show_invoices: false` must not get the page.
 */
export async function requirePortalPerm(
  perm: keyof PortalPerms
): Promise<PortalSession | null> {
  const session = await getPortalSession();
  if (!session) return null;
  if (!session.perms[perm]) redirect("/portal");
  return session;
}
