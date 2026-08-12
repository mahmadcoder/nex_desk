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
  email: string;
  role: StaffRole;
  fullName: string;
  /** `employees.avatar_url` — a public URL, or null when no photo is set. */
  avatarUrl: string | null;
  /** The employees row for this login, when they are an employee. */
  employeeId: string | null;
  /** owner | admin — may see money and perform destructive actions. */
  isPrivileged: boolean;
};

/**
 * A readable name out of an email address, for the case where no table has a
 * real one. `iam.afaq0101@gmail.com` becomes "Iam Afaq".
 *
 * Often not someone's actual name — but never worse than showing them the raw
 * address, which is what every staff surface did before.
 */
export function nameFromEmail(email?: string | null): string | null {
  const local = String(email ?? "").split("@")[0];
  if (!local) return null;

  const words = local
    .replace(/\d+/g, " ")
    .split(/[._\-+]+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

  return words.length ? words.join(" ") : null;
}

/** First name for a greeting. `split(" ")[0]` returns the whole string when
 *  there is no space in it, which is how an email ended up in "Welcome back". */
export function firstName(name: string): string {
  const first = String(name ?? "").trim().split(/\s+/)[0];
  return first || "there";
}

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
  let profileAvatar: string | null = null;

  const metaRole = user.user_metadata?.role as string | undefined;
  if (isStaffRole(metaRole)) {
    role = metaRole;
    fullName = (user.user_metadata?.full_name as string) || fullName;
  }

  try {
    const { data: profile } = await db
      .from("profiles")
      .select("role, is_active, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      // An explicitly deactivated profile overrides a stale metadata role.
      if (!profile.is_active) return null;
      if (isStaffRole(profile.role)) role = profile.role as StaffRole;
      else if (!role) return null; // e.g. role 'client' — not staff
      fullName = profile.full_name || fullName;
      // The fallback photo for anyone with no employees row — which is every
      // owner, since owner accounts are made by hand in SQL and the hiring
      // form is the only thing that ever writes an employees row.
      profileAvatar = profile.avatar_url ?? null;
    }
  } catch (e) {
    console.error("getCurrentStaff: profile lookup failed:", e);
    if (!role) return null;
  }

  if (!role) return null;

  let employeeId: string | null = null;
  let avatarUrl: string | null = null;
  try {
    const { data: employee } = await db
      .from("employees")
      .select("id, status, avatar_url, full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    // `employees.status` was recorded and never checked, so somebody marked
    // Terminated kept full access to the panel — the only working kill switch
    // was `profiles.is_active`, in a different table from the one the admin
    // was editing. Refusing the session outright is the point of the field.
    //
    // "On Leave" deliberately still works: someone on leave still needs their
    // own pay and leave pages, and locking them out would create a support
    // request every single time anyone took a holiday.
    if (employee && String(employee.status) === "Terminated") {
      return null;
    }

    employeeId = employee?.id ?? null;
    avatarUrl = employee?.avatar_url ?? null;

    // `employees.full_name` wins over everything above it. It is the one an
    // admin actually types during hiring, whereas `profiles.full_name` and
    // `user_metadata.full_name` are usually blank — which is why the sidebar
    // and the staff dashboard greeting used to render the raw email address.
    if (employee?.full_name) fullName = String(employee.full_name);
  } catch {
    // A missing `status` column (pre-2027-16) lands here, and a missing
    // `avatar_url` would too. Failing open on the status check is right: the
    // alternative is locking every employee out of the panel because a
    // migration has not been run yet.
    employeeId = null;
    avatarUrl = null;
  }

  // Last resort before printing an email address at somebody.
  if (fullName === user.email) fullName = nameFromEmail(user.email) ?? fullName;

  // employees wins when there is one — it is the photo clients see in the
  // portal. profiles is the fallback so an owner is not permanently faceless.
  const photo = avatarUrl ?? profileAvatar;

  return {
    userId: user.id,
    email: user.email ?? "",
    role,
    fullName,
    avatarUrl: photo,
    employeeId,
    isPrivileged: isPrivilegedRole(role),
  };
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
