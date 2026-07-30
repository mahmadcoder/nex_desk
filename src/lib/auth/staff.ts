import { createClient, createAdminClient } from "@/lib/supabase/server";

export const STAFF_ROLES = ["owner", "admin", "staff"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const isStaffRole = (role?: string | null): role is StaffRole =>
  STAFF_ROLES.includes((role ?? "") as StaffRole);

export type StaffCheck =
  | { ok: true; userId: string; role: StaffRole }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Resolves the caller's staff role for route handlers.
 *
 * Deliberately mirrors the middleware's logic: `user_metadata.role` first, then
 * a **service-role** profile lookup. Reading `profiles` with the anon client
 * instead — as `/api/pdf` used to — fails whenever the profile row is missing
 * or RLS blocks the read, which 403s admins who can otherwise use the whole
 * panel. Keep this and `middleware.ts` in agreement.
 */
export async function requireStaffRequest(): Promise<StaffCheck> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Not signed in" };

  const metaRole = user.user_metadata?.role as string | undefined;
  if (isStaffRole(metaRole)) {
    return { ok: true, userId: user.id, role: metaRole };
  }

  try {
    const { data: profile } = await createAdminClient()
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.is_active && isStaffRole(profile.role)) {
      return { ok: true, userId: user.id, role: profile.role as StaffRole };
    }
  } catch (e) {
    console.error("requireStaffRequest profile lookup failed:", e);
  }

  return { ok: false, status: 403, error: "Not authorised" };
}
