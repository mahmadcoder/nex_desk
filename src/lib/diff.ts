/**
 * What actually changed on a record.
 *
 * Profile edits were written blind: `saveEmployee` had no audit entry at all,
 * and `saveClient` logged `client.update` with empty meta — so you could see
 * that a record changed and never what changed in it. Nothing could be emailed
 * to the person affected, because nothing knew.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type FieldSpec = {
  key: string;
  label: string;
  /**
   * Whether a change here is worth emailing the person about.
   *
   * False does NOT mean secret — it is still recorded in the audit log. It
   * means "do not fire an automatic email". Salary, employment status and
   * internal notes are all `false`: those are conversations to have out loud,
   * and an automatic "your salary changed" triggered by a mistyped keystroke
   * is one you would be having backwards.
   */
  notify: boolean;
};

export type FieldChange = {
  key: string;
  label: string;
  from: string;
  to: string;
  notify: boolean;
};

/** Comparable, printable form of a stored value. */
function present(v: any): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v).trim();
}

/**
 * Compares only the keys named in `spec`, and only those actually present in
 * `after` — a partial update must not report every untouched column as
 * "changed to empty".
 */
export function diffFields(
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined,
  spec: FieldSpec[]
): FieldChange[] {
  if (!before || !after) return [];

  const changes: FieldChange[] = [];

  for (const f of spec) {
    if (!(f.key in after)) continue;

    const from = present(before[f.key]);
    const to = present(after[f.key]);
    if (from === to) continue;

    changes.push({ key: f.key, label: f.label, from, to, notify: f.notify });
  }

  return changes;
}

/**
 * The change list as one string, ready for the `{{changes}}` template variable.
 *
 * `fillTemplate` is a flat regex with no loop support, but the HTML email
 * renderer turns a run of "• " lines into a styled callout — so a pre-joined
 * string renders correctly with no template-engine change, and unlike a
 * `bodyOverride` the copy stays editable in the Email Centre.
 */
export function changeLines(changes: FieldChange[]): string {
  return changes
    .map((c) => {
      const from = c.from || "(blank)";
      const to = c.to || "(blank)";
      return `• ${c.label}: ${from} → ${to}`;
    })
    .join("\n");
}

/** Fields worth telling a client about, and the ones only worth recording. */
export const CLIENT_FIELDS: FieldSpec[] = [
  { key: "name", label: "Name", notify: true },
  { key: "company", label: "Company", notify: true },
  { key: "email", label: "Email", notify: true },
  { key: "phone", label: "Phone", notify: true },
  { key: "whatsapp", label: "WhatsApp", notify: true },
  { key: "address", label: "Address", notify: true },
  { key: "city", label: "City", notify: true },
  { key: "country", label: "Country", notify: true },
  { key: "tax_id", label: "Tax ID", notify: true },
  { key: "preferred_currency", label: "Billing currency", notify: true },
  // Recorded, never emailed.
  { key: "source", label: "Source", notify: false },
  { key: "notes", label: "Internal notes", notify: false },
  { key: "lifecycle", label: "Lifecycle", notify: false },
  { key: "referred_by_client_id", label: "Referrer", notify: false },
];

/** The same, for an employee. */
export const EMPLOYEE_FIELDS: FieldSpec[] = [
  { key: "full_name", label: "Name", notify: true },
  { key: "email", label: "Email", notify: true },
  { key: "phone", label: "Phone", notify: true },
  { key: "job_title", label: "Job title", notify: true },
  { key: "seniority", label: "Seniority", notify: true },
  { key: "employment_type", label: "Employment type", notify: true },
  { key: "city", label: "City", notify: true },
  { key: "country", label: "Country", notify: true },
  { key: "skills", label: "Skills", notify: true },
  // Recorded, never emailed. Salary has its own deliberate template
  // (`employee_salary_revised`); status is a conversation, not a notification.
  { key: "salary_amount", label: "Salary", notify: false },
  { key: "salary_currency", label: "Salary currency", notify: false },
  { key: "status", label: "Status", notify: false },
  { key: "joining_date", label: "Joining date", notify: false },
  { key: "leaving_date", label: "Leaving date", notify: false },
  { key: "notes", label: "Internal notes", notify: false },
];
