/**
 * What an agency actually buys on a client's behalf.
 *
 * The list is deliberately short and concrete — a long taxonomy nobody can
 * choose from quickly gets ignored, and everything genuinely unusual lands in
 * `other`, which asks for a description instead of a label.
 *
 * `recurs` only pre-ticks the renewal field. A domain is annual by default
 * because forgetting one takes a client's site off the internet; a one-off
 * stock photo pack is not.
 */
export type ExpenseCategory = {
  value: string;
  label: string;
  /** Shown under the picker so the right box gets used. */
  hint: string;
  /** Pre-suggest a renewal date one year out. */
  recurs: boolean;
  /** Renewal lapsing here is a client-visible outage, not just a bill. */
  critical: boolean;
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    value: "domain",
    label: "Domain name",
    hint: "Registered or renewed on their behalf",
    recurs: true,
    critical: true,
  },
  {
    value: "hosting",
    label: "Hosting or server",
    hint: "Shared hosting, VPS, managed platform",
    recurs: true,
    critical: true,
  },
  {
    value: "ssl",
    label: "SSL certificate",
    hint: "Paid certificate beyond the free one",
    recurs: true,
    critical: true,
  },
  {
    value: "email",
    label: "Business email",
    hint: "Google Workspace, Zoho, mailbox licences",
    recurs: true,
    critical: true,
  },
  {
    value: "license",
    label: "Plugin or theme licence",
    hint: "Premium plugin, theme, or paid template",
    recurs: true,
    critical: false,
  },
  {
    value: "tool",
    label: "Tool or subscription",
    hint: "Design tool, SaaS seat, monitoring",
    recurs: true,
    critical: false,
  },
  {
    value: "api",
    label: "API or third-party service",
    hint: "Payment gateway, SMS, maps, AI credits",
    recurs: false,
    critical: false,
  },
  {
    value: "ads",
    label: "Ad spend",
    hint: "Meta, Google Ads, or boosted posts",
    recurs: false,
    critical: false,
  },
  {
    value: "assets",
    label: "Stock assets",
    hint: "Photos, icons, fonts, illustrations",
    recurs: false,
    critical: false,
  },
  {
    value: "other",
    label: "Something else",
    hint: "Describe it below in your own words",
    recurs: false,
    critical: false,
  },
];

const BY_VALUE = new Map(EXPENSE_CATEGORIES.map((c) => [c.value, c]));

export function expenseCategory(value: string | null | undefined): ExpenseCategory {
  return BY_VALUE.get(String(value)) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

/** Human label for emails, PDFs and the portal. */
export function expenseCategoryLabel(value: string | null | undefined): string {
  return expenseCategory(value).label;
}

/** True for things whose lapse breaks something the client can see. */
export function isCriticalCategory(value: string | null | undefined): boolean {
  return expenseCategory(value).critical;
}
