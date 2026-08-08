/**
 * Audit actions, in English.
 *
 * `audit_log.action` is a dotted machine string — `project_file.delete`,
 * `deal.won`. Readable enough for a developer, useless to somebody asking who
 * deleted a client's contract at 2am. The viewer shows both: the sentence, and
 * the raw key underneath for anyone who wants it.
 *
 * A key with no entry falls back to a humanised form of itself, so a new action
 * added anywhere in the codebase still reads sensibly without touching this
 * file. Adding it here is an improvement, not a requirement.
 */

const ACTIONS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.login_failed": "Failed sign-in attempt",

  "client.create": "Created a client",
  "client.update": "Edited a client",
  "client.delete": "Deleted a client",
  "client.credentials": "Changed client credentials",
  "client.permissions": "Changed what a client can see",
  "client.dormant": "Paused a client",
  "client.reactivate": "Reactivated a client",
  "client.monthly_report": "Sent a monthly report",
  "client.referrer": "Recorded a referrer",
  "client.return_request": "Client asked to restart",

  "deal.quote_sent": "Sent a quote",
  "deal.quote_chased": "Chased a quote",
  "deal.accepted": "Client accepted an agreement",
  "deal.won": "Marked a deal won",
  "deal.lost": "Marked a deal lost",
  "deal.retainer": "Changed retainer terms",
  "deal.services": "Changed which services a deal covers",

  "project.update": "Edited a project",
  "project.rate": "Rated the team on a project",
  "project_file.upload": "Uploaded a project file",
  "project_file.delete": "Deleted a project file",
  "project_file.visibility": "Changed who can see a file",

  "change_request.raised": "Client raised a change request",
  "change_request.quote": "Quoted a change request",
  "change_request.approve": "Approved a change request",
  "change_request.decline": "Declined a change request",
  "change_request.complete": "Completed a change request",

  "expense.create": "Added an expense",
  "expense.update": "Edited an expense",
  "expense.delete": "Deleted an expense",
  "expense.billed": "Billed an expense on",
  "agency_expense.create": "Added an agency expense",
  "agency_expense.update": "Edited an agency expense",
  "agency_expense.delete": "Deleted an agency expense",

  "employee.create": "Added an employee",
  "employee.update": "Edited an employee",
  "employee.status": "Changed an employee's status",
  "employee.photo": "Changed an employee photo",
  "employee.photo_decision": "Decided on a photo request",
  "compensation.delete": "Deleted a pay record",
  // Presence an admin set by hand rather than somebody clocking in. Worth its
  // own line precisely because it is the exception.
  "attendance.override": "Corrected an attendance record",

  "email.resend": "Re-sent a failed email",
  "document.uploaded": "Uploaded a document",
  "message.post": "Posted a message",
  "meeting.create": "Booked a meeting",
  "meeting.update": "Changed a meeting",
  "meeting.cancel": "Cancelled a meeting",
  "meeting.notes": "Wrote meeting notes",
  "settings.update": "Changed settings",
};

/** Entities worth filtering by, in the order somebody would look for them. */
export const ENTITY_FILTERS: [string, string][] = [
  ["profiles", "Sign-ins"],
  ["clients", "Clients"],
  ["deals", "Deals & agreements"],
  ["projects", "Projects"],
  ["project_files", "Files"],
  ["invoices", "Invoices"],
  ["payments", "Payments"],
  ["change_requests", "Change requests"],
  ["employees", "Employees"],
  ["attendance", "Attendance"],
  ["meetings", "Meetings"],
  ["email_log", "Emails"],
  ["settings", "Settings"],
];

export function describeAction(action: string): string {
  if (ACTIONS[action]) return ACTIONS[action];

  // `deal.quote_sent` → "Deal quote sent". Better than showing nothing, and it
  // means a new action never renders as a blank cell.
  const words = action.replace(/[._]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
