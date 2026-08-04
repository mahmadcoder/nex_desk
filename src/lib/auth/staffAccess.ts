/**
 * Which parts of the control panel a `staff` employee may reach.
 *
 * Owners and admins are unrestricted. Employees get their own work only —
 * they must not see leads, deals, invoices, payroll or agency settings.
 *
 * The sidebar mirrors this list, but hiding a link is not access control:
 * `AdminLayout` enforces it on every request.
 */
const STAFF_ALLOWED_SEGMENTS = [
  "", // dashboard
  "clients",
  "projects",
  "daily-logs",
  // Their own leave balance and requests. The page itself scopes to the
  // signed-in employee, so this exposes nobody else's.
  "leave",
  // Their own notifications: task assignments and leave decisions. The
  // query in lib/notifications.ts scopes staff to their own rows only.
  "notifications",
  // Their OWN pay only — the page scopes every query to the signed-in
  // employee id and never accepts one from the URL.
  "my-pay",
  "login",
];

/** True when a role may open the given path under the admin base. */
export function canStaffAccess(role: string, pathname: string, base: string): boolean {
  if (role !== "staff") return true;

  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  const segment = rest.replace(/^\/+/, "").split("/")[0] ?? "";
  return STAFF_ALLOWED_SEGMENTS.includes(segment);
}
