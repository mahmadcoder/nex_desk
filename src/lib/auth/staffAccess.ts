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
  // Their own profile and photo. `/employees` stays closed: this page reads
  // only the caller's own row, and the one action behind it writes
  // `avatar_url` matched on the caller's user_id, never an id from the client.
  "profile",
  "login",

  // ---- Added alongside the screens themselves ----------------------------
  //
  // Each of these is in STAFF_NAV and each scopes itself server-side. They
  // were missing from this list, so a staff member clicking their own sidebar
  // was silently bounced back to the dashboard.

  // The Kanban. Scoped twice in the query: `assigned_employee_id = me`, then
  // filtered again against `assignedClientIds`.
  "tasks",
  // Meetings, deadlines, milestones and their own leave — every source scoped
  // to their assigned clients inside the page.
  "calendar",
  // Only meetings for clients they are assigned to, and they cannot book.
  "meetings",
  // Tickets for their assigned clients. `visibleTickets` fails closed.
  "tickets",
  // The handbook is FOR staff. Every employee reads; owner/admin write.
  "handbook",
];

/**
 * Deliberately still closed to staff, and why — so the next person adding a
 * route knows this list is a decision rather than an oversight:
 *
 *   hr, recruitment, payroll  — salaries and applicants' expected salaries
 *   attendance, timesheets    — everyone else's hours and lateness
 *   reports, insights, profit — margin, lifetime client value, cost per hour
 *   audit                     — who changed and deleted what, agency-wide
 *   leads, deals, invoices    — money and the pipeline
 *   employees, settings       — the team's records and agency configuration
 *
 * The allowlist fails closed, so a new route is unreachable by staff until it
 * is added here on purpose.
 */

/** True when a role may open the given path under the admin base. */
export function canStaffAccess(role: string, pathname: string, base: string): boolean {
  if (role !== "staff") return true;

  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  const segment = rest.replace(/^\/+/, "").split("/")[0] ?? "";
  return STAFF_ALLOWED_SEGMENTS.includes(segment);
}
