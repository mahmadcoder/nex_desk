export interface AgencyBankAccount {
  id: string;
  name: string;
  currency: string;
  beneficiary: string;
  bank_name: string;
  account_number: string;
  iban?: string;
  swift?: string;
  routing_number?: string;
  branch?: string;
  instructions?: string;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
}
