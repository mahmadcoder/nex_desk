import { AgencyBankAccount } from "@/types/bank";

export const DEFAULT_AGENCY_BANK: AgencyBankAccount = {
  id: "bank_default_usd",
  name: "USD International Wire (Wise)",
  currency: "USD",
  beneficiary: "Nex Desk",
  bank_name: "Wise / Community Federal Savings Bank",
  account_number: "9876543210",
  routing_number: "026073150",
  swift: "CMFGUS33",
  iban: "",
  branch: "New York, United States",
  instructions: "Wire or ACH transfer in USD. Always include your invoice number in the payment memo.",
  is_active: true,
  is_default: true,
};

/**
 * Normalizes whatever is in `settings.bank_details` into an array of AgencyBankAccount.
 * Handles:
 * 1. An array of AgencyBankAccount objects (new multi-bank format).
 * 2. Legacy key-value Record<string, string> (e.g. { "Account title": "...", "Bank": "..." }).
 * 3. Null or undefined settings.
 */
export function normalizeBankDetails(
  raw: unknown,
  fallbackCompanyName = "Nex Desk"
): AgencyBankAccount[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((item, idx) => ({
      id: String(item.id || `bank_${idx}_${Date.now()}`),
      name: String(item.name || `Bank Account ${idx + 1}`),
      currency: String(item.currency || "USD").toUpperCase(),
      beneficiary: String(item.beneficiary || fallbackCompanyName),
      bank_name: String(item.bank_name || "Commercial Bank"),
      account_number: String(item.account_number || ""),
      iban: item.iban ? String(item.iban) : undefined,
      swift: item.swift ? String(item.swift) : undefined,
      routing_number: item.routing_number ? String(item.routing_number) : undefined,
      branch: item.branch ? String(item.branch) : undefined,
      instructions: item.instructions ? String(item.instructions) : undefined,
      is_active: item.is_active !== false,
      is_default: Boolean(item.is_default),
      created_at: item.created_at ? String(item.created_at) : undefined,
    }));
  }

  // Handle legacy flat object: { "Account title": "...", "Bank": "...", "IBAN": "..." }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    const hasValues = Object.values(record).some((v) => Boolean(v && String(v).trim()));
    if (hasValues) {
      const bankName = String(record["Bank"] || record["Bank Name"] || "Agency Wire");
      const title = String(record["Account title"] || record["Beneficiary"] || fallbackCompanyName);
      const accNum = String(record["Account number"] || record["Account Number"] || record["IBAN"] || "");
      const iban = String(record["IBAN"] || "");
      const branch = String(record["Branch code"] || record["Branch"] || "");
      const swift = String(record["SWIFT"] || record["Swift"] || record["SWIFT / BIC Code"] || "");

      return [
        {
          id: "primary_bank",
          name: `${bankName} Primary`,
          currency: "USD",
          beneficiary: title,
          bank_name: bankName,
          account_number: accNum || iban,
          iban: iban || undefined,
          swift: swift || undefined,
          routing_number: branch || undefined,
          branch: branch || undefined,
          instructions: "Please include your invoice number in the payment reference.",
          is_active: true,
          is_default: true,
          created_at: new Date().toISOString(),
        },
      ];
    }
  }

  return [{ ...DEFAULT_AGENCY_BANK, beneficiary: fallbackCompanyName }];
}

/**
 * Filter accounts permitted for a client / invoice:
 * 1. Only active accounts (`is_active === true`).
 * 2. If client has `allowedIds` scoped, restrict strictly to those IDs.
 * 3. Falls back safely to all active accounts if none match the restricted IDs.
 */
export function filterAllowedBankAccounts(
  allAccounts: AgencyBankAccount[],
  allowedIds?: string[] | null
): AgencyBankAccount[] {
  const active = allAccounts.filter((a) => a.is_active !== false);
  if (!active.length) return allAccounts;

  if (allowedIds && Array.isArray(allowedIds) && allowedIds.length > 0) {
    const scoped = active.filter((a) => allowedIds.includes(a.id));
    if (scoped.length > 0) return scoped;
  }

  return active;
}
