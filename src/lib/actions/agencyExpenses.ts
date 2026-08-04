"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { asUuid } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * What the agency spends on itself.
 *
 * Never billed to a client — that is `project_expenses`, which requires a
 * client_id precisely so the two cannot be confused.
 */

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

export type AgencyExpenseInput = {
  id?: string | null;
  category: string;
  vendor?: string | null;
  label: string;
  amount: number;
  currency: string;
  incurredOn: string;
  isRecurring?: boolean;
  renewsOn?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
};

export async function saveAgencyExpense(
  input: AgencyExpenseInput
): Promise<Result<{ id: string }>> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const label = input.label?.trim();
  if (!label) return { ok: false, error: "Say what this was — the tool, the bill, whatever it is." };

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Enter a valid amount." };
  }

  const row = {
    category: input.category || "other",
    vendor: input.vendor?.trim() || null,
    label,
    amount,
    currency: String(input.currency || "USD").toUpperCase(),
    incurred_on: input.incurredOn || new Date().toISOString().slice(0, 10),
    is_recurring: !!input.isRecurring,
    // A renewal date on a one-off would produce a reminder for something that
    // is never charged again.
    renews_on: input.isRecurring ? input.renewsOn || null : null,
    receipt_url: input.receiptUrl?.trim() || null,
    notes: input.notes?.trim() || null,
  };

  const existingId = input.id ? asUuid(input.id) : null;

  const { data, error } = existingId
    ? await db.from("agency_expenses").update(row).eq("id", existingId).select().single()
    : await db.from("agency_expenses")
        .insert({ ...row, recorded_by: me.userId })
        .select()
        .single();

  if (error || !data) {
    console.error("saveAgencyExpense failed:", error);
    return {
      ok: false,
      error:
        error?.code === "42P01"
          ? "The agency_expenses table is missing — run supabase/idempotent_fixes_2027_14.sql."
          : error?.message || "Could not save that expense.",
    };
  }

  await recordAudit(
    me.userId,
    existingId ? "agency_expense.update" : "agency_expense.create",
    "agency_expenses",
    data.id,
    { label, amount, currency: row.currency }
  );

  revalidatePath(`/${ADMIN}/expenses`);
  revalidatePath(`/${ADMIN}/books`);
  return { ok: true, id: data.id };
}

export async function deleteAgencyExpense(expenseId: string): Promise<Result> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(expenseId);
  if (!id) return { ok: false, error: "Invalid expense reference." };

  const { data: row } = await db
    .from("agency_expenses").select("label, amount, currency").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "That expense no longer exists." };

  const { error } = await db.from("agency_expenses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await recordAudit(me.userId, "agency_expense.delete", "agency_expenses", id, {
    label: row.label, amount: row.amount, currency: row.currency,
  });

  revalidatePath(`/${ADMIN}/expenses`);
  revalidatePath(`/${ADMIN}/books`);
  return { ok: true };
}
