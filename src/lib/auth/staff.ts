import { createClient, createAdminClient } from "@/lib/supabase/server";

export const STAFF_ROLES = ["owner", "admin", "staff"] as const;
export const PRIVILEGED_ROLES = ["owner", "admin"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const isStaffRole = (role?: string | null): role is StaffRole =>
  STAFF_ROLES.includes((role ?? "") as StaffRole);

export const isPrivilegedRole = (role?: string | null): boolean =>
  (PRIVILEGED_ROLES as readonly string[]).includes(role ?? "");

export type CurrentStaff = {
  userId: string;
  role: StaffRole;
  fullName: string;
  /** The employees row for this login, when they are an employee. */
  employeeId: string | null;
  /** owner | admin — may see money and perform destructive actions. */
  isPrivileged: boolean;
};

export type StaffCheck =
  | { ok: true; userId: string; role: StaffRole }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Resolves the signed-in user's staff identity, or null.
 *
 * Deliberately mirrors the middleware: `user_metadata.role` first, then a
 * **service-role** profile lookup. Reading `profiles` with the anon client
 * instead fails whenever the row is missing or RLS blocks it, which is what
 * used to 403 admins out of `/api/pdf`.
 *
 * Returns null rather than throwing so callers can decide between "redirect",
 * "404" and "throw". It never guesses a role — no session means no access.
 */
export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  let user;
  try {
    const supabase = await createClient();
    ({ data: { user } } = await supabase.auth.getUser());
  } catch (e) {
    console.error("getCurrentStaff: session lookup failed:", e);
    return null;
  }
  if (!user) return null;

  const db = createAdminClient();

  let role: StaffRole | null = null;
  let fullName = user.email ?? "User";

  const metaRole = user.user_metadata?.role as string | undefined;
  if (isStaffRole(metaRole)) {
    role = metaRole;
    fullName = (user.user_metadata?.full_name as string) || fullName;
  }

  try {
    const { data: profile } = await db
      .from("profiles")
      .select("role, is_active, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      // An explicitly deactivated profile overrides a stale metadata role.
      if (!profile.is_active) return null;
      if (isStaffRole(profile.role)) role = profile.role as StaffRole;
      else if (!role) return null; // e.g. role 'client' — not staff
      fullName = profile.full_name || fullName;
    }
  } catch (e) {
    console.error("getCurrentStaff: profile lookup failed:", e);
    if (!role) return null;
  }

  if (!role) return null;

  let employeeId: string | null = null;
  try {
    const { data: employee } = await db
      .from("employees").select("id").eq("user_id", user.id).maybeSingle();
    employeeId = employee?.id ?? null;
  } catch {
    employeeId = null;
  }

  return { userId: user.id, role, fullName, employeeId, isPrivileged: isPrivilegedRole(role) };
}

/**
 * The clients this employee is assigned to.
 *
 * Fails closed: an employee with no login link or no assignments gets an empty
 * list, never "everything".
 */
export async function assignedClientIds(employeeId: string | null): Promise<string[]> {
  if (!employeeId) return [];
  const { data, error } = await createAdminClient()
    .from("client_employee_assignments")
    .select("client_id")
    .eq("employee_id", employeeId);

  if (error) {
    console.error("assignedClientIds failed:", error);
    return [];
  }
  return [...new Set((data ?? []).map((r) => r.client_id as string))];
}

/** Route-handler flavour of `getCurrentStaff`, shaped for JSON responses. */
export async function requireStaffRequest(): Promise<StaffCheck> {
  const me = await getCurrentStaff();
  if (!me) return { ok: false, status: 401, error: "Not signed in" };
  return { ok: true, userId: me.userId, role: me.role };
}
