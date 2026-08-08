/**
 * What we ask for when onboarding a client or a staff member.
 *
 * One list feeds all three surfaces — the PDF, the WhatsApp text and the
 * fill-in form — so the checklist you send can never ask for something the
 * form does not collect, or miss something the form requires.
 *
 * Mirrors `ClientDialog` and `EmployeesClient`. When a field is added there,
 * add it here.
 */

export type IntakeField = {
  key: string;
  label: string;
  /** What to actually type. A label alone gets "Karachi" in the address box. */
  hint?: string;
  required?: boolean;
  type?: "text" | "email" | "tel" | "date" | "textarea";
};

export const CLIENT_INTAKE: IntakeField[] = [
  { key: "name", label: "Your full name", required: true, type: "text" },
  { key: "email", label: "Email address", hint: "This becomes your portal login", required: true, type: "email" },
  { key: "phone", label: "Phone / WhatsApp", hint: "With country code", type: "tel" },
  { key: "company", label: "Company or brand name", hint: "Leave blank if you are an individual" },
  { key: "address", label: "Billing address", hint: "The address that should appear on invoices", type: "textarea" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "tax_id", label: "Tax / VAT / NTN number", hint: "Only if you need it printed on invoices" },
  { key: "notes", label: "Anything else we should know", hint: "Optional", type: "textarea" },
];

/**
 * Staff intake.
 *
 * Deliberately no salary, seniority or department. Those are agreed or
 * assigned by the agency — asking someone to state their own salary on an
 * onboarding form reopens a negotiation that was already closed.
 */
export const STAFF_INTAKE: IntakeField[] = [
  { key: "full_name", label: "Your full name", required: true, type: "text" },
  { key: "email", label: "Email address", hint: "This becomes your login", required: true, type: "email" },
  { key: "phone", label: "Phone / WhatsApp", hint: "With country code", type: "tel" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "education", label: "Education", hint: "Degree or qualification, and where" },
  { key: "skills", label: "Your main skills", hint: "Comma separated, e.g. React, Figma, SEO" },
  {
    key: "bank_details",
    label: "Bank details for salary",
    hint: "Account title, bank, account number or IBAN",
    type: "textarea",
  },
  { key: "notes", label: "Anything else", hint: "Optional", type: "textarea" },
];

export const intakeFieldsFor = (kind: "client" | "staff") =>
  kind === "client" ? CLIENT_INTAKE : STAFF_INTAKE;

export const intakeTitleFor = (kind: "client" | "staff") =>
  kind === "client" ? "Client details" : "New team member details";

/** The WhatsApp message. Plain text — no markdown, which WhatsApp mangles. */
export function intakeMessage(kind: "client" | "staff", url: string, agency = "Nex Desk") {
  const fields = intakeFieldsFor(kind)
    .map((f) => `• ${f.label}${f.required ? " (required)" : ""}`)
    .join("\n");

  const opening =
    kind === "client"
      ? `Great speaking with you. To set up your ${agency} dashboard I need a few details:`
      : `Welcome aboard. To get you set up on the ${agency} system I need a few details:`;

  return `${opening}\n\n${fields}\n\nEasiest way is this form — it takes two minutes:\n${url}\n\nOr just reply here with the answers and I will add them myself.\n\n${agency}`;
}
