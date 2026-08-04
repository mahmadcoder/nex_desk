/**
 * What the agency spends on ITSELF.
 *
 * Deliberately a separate list from `expenseCategories.ts`, which covers
 * things bought FOR a client and re-billed to them. The two look similar and
 * mixing them is the obvious mistake: a Cursor seat charged to a project
 * quietly reduces that project's margin for a cost the client never caused,
 * and a client's plugin licence filed here can never be re-billed.
 *
 * `recurs` only pre-fills a renewal date. Subscriptions renew silently and
 * that is exactly what the reminder exists to prevent.
 */
export type AgencyExpenseCategory = {
  value: string;
  label: string;
  hint: string;
  recurs: boolean;
};

export const AGENCY_EXPENSE_CATEGORIES: AgencyExpenseCategory[] = [
  {
    value: "software",
    label: "Software & subscriptions",
    hint: "Cursor, Figma, hosting for our own site, AI credits",
    recurs: true,
  },
  {
    value: "hardware",
    label: "Hardware & equipment",
    hint: "Laptops, monitors, phones, peripherals",
    recurs: false,
  },
  {
    value: "office",
    label: "Office & utilities",
    hint: "Rent, internet, electricity, furniture",
    recurs: true,
  },
  {
    value: "marketing",
    label: "Marketing & advertising",
    hint: "Our own ads, domains, content, sponsorships",
    recurs: false,
  },
  {
    value: "travel",
    label: "Travel & meetings",
    hint: "Client visits, conferences, transport",
    recurs: false,
  },
  {
    value: "professional",
    label: "Professional fees",
    hint: "Accountant, legal advice, registrations, licences",
    recurs: false,
  },
  {
    value: "bank",
    label: "Bank & payment charges",
    hint: "Account fees and gateway costs not tied to one payment",
    recurs: true,
  },
  {
    value: "other",
    label: "Something else",
    hint: "Describe it below in your own words",
    recurs: false,
  },
];

const BY_VALUE = new Map(AGENCY_EXPENSE_CATEGORIES.map((c) => [c.value, c]));

export function agencyCategory(value: string | null | undefined): AgencyExpenseCategory {
  return (
    BY_VALUE.get(String(value)) ??
    AGENCY_EXPENSE_CATEGORIES[AGENCY_EXPENSE_CATEGORIES.length - 1]
  );
}

export function agencyCategoryLabel(value: string | null | undefined): string {
  return agencyCategory(value).label;
}
