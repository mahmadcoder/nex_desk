"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { sendEmail } from "@/lib/email/send";
import { asUuid, money } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";
import { notify } from "@/lib/actions/notify";
import { fmtMonth } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * Paying people, as opposed to deciding what to pay them.
 *
 * `employee_compensation` records the decision — a raise, a bonus — and says
 * so in its own email copy. This records the transfer: the month it covers,
 * what actually went out, and the slip proving it.
 *
 * Kept apart because they answer different questions and, more practically,
 * because a raise agreed in June that starts in July is one row in one table
 * and none at all in the other.
 */

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

export type SalaryPaymentInput = {
  employeeId: string;
  /** Any date inside the month being paid for; normalised to the 1st. */
  periodMonth: string;
  /** BASE pay. Net is derived as amount + bonus - deductions, never stored. */
  amount: number;
  bonus?: number;
  deductions?: number;
  bonusNote?: string | null;
  deductionNote?: string | null;
  currency: string;
  paidOn?: string | null;
  method?: string | null;
  reference?: string | null;
  slipUrl?: string | null;
  note?: string | null;
  /** Off for back-filling history the person already knows about. */
  notifyEmployee?: boolean;
};

/** First of the month, so grouping and filtering behave. */
function monthStart(value: string): string | null {
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const monthLabel = (iso: string) =>
  fmtMonth(`${iso}T00:00:00`);

export async function recordSalaryPayment(
  input: SalaryPaymentInput
): Promise<Result<{ id: string; emailed: boolean }>> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const employeeId = asUuid(input.employeeId);
  if (!employeeId) return { ok: false, error: "Invalid employee reference." };

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter the amount you actually transferred." };
  }

  const period = monthStart(input.periodMonth);
  if (!period) return { ok: false, error: "Pick the month this payment covers." };

  const { data: employee } = await db
    .from("employees").select("id, full_name, email").eq("id", employeeId).maybeSingle();
  if (!employee) return { ok: false, error: "Employee not found." };

  // Clamped at zero: a negative bonus is a deduction, and letting one be
  // entered as the other makes the payslip lie about which is which.
  const bonus = Math.max(0, Number(input.bonus) || 0);
  const deductions = Math.max(0, Number(input.deductions) || 0);

  if (deductions > amount + bonus) {
    return { ok: false, error: "Deductions cannot exceed the gross pay." };
  }

  const currency = String(input.currency || "USD").toUpperCase();

  const { data, error } = await db.from("salary_payments").insert({
    employee_id: employeeId,
    period_month: period,
    amount,
    bonus,
    deductions,
    bonus_note: bonus > 0 ? input.bonusNote?.trim() || null : null,
    deduction_note: deductions > 0 ? input.deductionNote?.trim() || null : null,
    currency,
    paid_on: input.paidOn || new Date().toISOString().slice(0, 10),
    method: input.method || "bank_transfer",
    reference: input.reference?.trim() || null,
    slip_url: input.slipUrl?.trim() || null,
    note: input.note?.trim() || null,
    recorded_by: me.userId,
  }).select().single();

  if (error || !data) {
    console.error("recordSalaryPayment failed:", error);
    return {
      ok: false,
      error:
        error?.code === "42P01"
          ? "The salary_payments table is missing — run supabase/idempotent_fixes_2027_14.sql."
          : error?.message || "Could not record that payment.",
    };
  }

  let emailed = false;
  if (input.notifyEmployee !== false && employee.email) {
    const res = await sendEmail({
      templateKey: "salary_paid",
      to: employee.email,
      actorId: me.userId,
      vars: {
        employee_name: employee.full_name,
        amount: money(amount, currency),
        period: monthLabel(period),
        paid_on: data.paid_on,
        method: (input.method || "bank transfer").replace(/_/g, " "),
        reference: input.reference?.trim() || "—",
        slip_line: input.slipUrl?.trim()
          ? `A copy of the transfer slip is here:\n${input.slipUrl.trim()}`
          : "",
        note: input.note?.trim() || "",
        sender_name: me.fullName ?? "Nex Desk",
      },
    });
    emailed = res.ok;
    if (!emailed) console.error("Salary payment email failed:", res);
  }

  // In-app too, addressed to that one person. The notification centre already
  // scopes employee-audience rows, so nobody else can see it.
  await notify({
    kind: "salary.paid",
    title: `${money(amount, currency)} paid for ${monthLabel(period)}`,
    body: input.slipUrl?.trim()
      ? "The transfer slip is on your My Pay page."
      : "Recorded against your account.",
    href: `/${ADMIN}/my-pay`,
    entity: "salary_payments",
    entityId: data.id,
    actorLabel: me.fullName ?? null,
    actorKind: "staff",
    employeeId,
  });

  // The amount is in the audit meta on purpose — "who changed someone's pay
  // record, and to what" is exactly what an audit log is for.
  await recordAudit(me.userId, "salary.paid", "employees", employeeId, {
    amount, currency, period, payment_id: data.id,
  });

  revalidatePath(`/${ADMIN}/employees/${employeeId}`);
  revalidatePath(`/${ADMIN}/my-pay`);
  revalidatePath(`/${ADMIN}/books`);
  return { ok: true, id: data.id, emailed };
}

export async function deleteSalaryPayment(paymentId: string): Promise<Result> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(paymentId);
  if (!id) return { ok: false, error: "Invalid payment reference." };

  const { data: row } = await db
    .from("salary_payments")
    .select("employee_id, amount, currency, period_month")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "That payment no longer exists." };

  const { error } = await db.from("salary_payments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  // No email. Telling someone their payment record was deleted, with no
  // context, would alarm them more than it informs them — that conversation
  // belongs to a person.
  await recordAudit(me.userId, "salary.payment_deleted", "employees", row.employee_id, {
    amount: row.amount, currency: row.currency, period: row.period_month,
  });

  revalidatePath(`/${ADMIN}/employees/${row.employee_id}`);
  revalidatePath(`/${ADMIN}/my-pay`);
  revalidatePath(`/${ADMIN}/books`);
  return { ok: true };
}

/**
 * The signed-in person's own payments.
 *
 * Scoped inside the query to `me.employeeId` — no id is ever accepted from the
 * caller, so there is nothing to tamper with.
 */
export async function myPayments(): Promise<any[]> {
  const me = await getCurrentStaff();
  if (!me?.employeeId) return [];

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("salary_payments")
      .select("*")
      .eq("employee_id", me.employeeId)
      .order("period_month", { ascending: false })
      .order("paid_on", { ascending: false });

    if (error) {
      console.error("myPayments failed:", error);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.error("myPayments threw:", e);
    return [];
  }
}
