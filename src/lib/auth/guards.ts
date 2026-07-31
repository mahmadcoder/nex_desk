import { getCurrentStaff, type CurrentStaff } from "@/lib/auth/staff";

/**
 * Server-action guards.
 *
 * These THROW. The previous `requireStaff()` implementations (duplicated in
 * lib/actions/index.ts and lib/actions/cms.ts) failed *open* — with no session
 * at all they returned `{ role: "owner" }`, and no caller ever inspected the
 * role. That made `deleteClient`, `lockDeal` and `saveSettings` reachable by an
 * unauthenticated request. Never reintroduce a fallback identity here.
 */

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** Any signed-in staff member (owner, admin or staff). */
export async function requireStaff(): Promise<CurrentStaff> {
  const me = await getCurrentStaff();
  if (!me) throw new AuthError("You need to sign in to do that.");
  return me;
}

/**
 * Owner or admin only.
 *
 * Use for anything touching money, client records, employee records, agency
 * settings, or assignments — an employee must not be able to grant themselves
 * a client, which would defeat the assignment-scoped pages.
 */
export async function requireOwnerAdmin(): Promise<CurrentStaff> {
  const me = await requireStaff();
  if (!me.isPrivileged) {
    throw new AuthError("Only an owner or admin can do that.");
  }
  return me;
}
