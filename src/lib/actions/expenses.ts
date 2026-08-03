"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { asUuid, getSiteBaseUrl, money } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";
import { expenseCategoryLabel } from "@/config/expenseCategories";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * Things bought on the client's behalf.
 *
 * Every function here RETURNS its errors rather than throwing them: Next.js
 * strips thrown Server Action messages in production, and "the button did
 * nothing" is the worst possible failure mode for a form with a receipt
 * attached to it.
 */

export type ExpenseInput = {
  id?: string | null;
  clientId: string;
  projectId?: string | null;
  category: string;
  label: string;
  vendor?: string | null;
  details?: string | null;
  cost: number;
  billAmount: number;
  currency: string;
  incurredOn: string;
  renewsOn?: string | null;
  receiptUrl?: string | null;
  status?: "unbilled" | "invoiced" | "absorbed";
  visibleToClient?: boolean;
  /** Email the client a copy with the receipt. Off for quiet corrections. */
  notifyClient?: boolean;
};

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * Records an extra, or edits one.
 *
 * The client email carries the receipt link and the exact figure, so the first
 * time they hear about a charge is not on an invoice.
 */
export async function saveExpense(input: ExpenseInput): Promise<Result<{ id: string }>> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const clientId = asUuid(input.clientId);
  if (!clientId) return { ok: false, error: "Invalid client reference." };

  const label = input.label?.trim();
  if (!label) {
    return { ok: false, error: "Say what this was — a domain name, the tool's name, whatever it is." };
  }

  const cost = Number(input.cost);
  const billAmount = Number(input.billAmount);
  if (!Number.isFinite(cost) || cost < 0) return { ok: false, error: "Enter a valid cost." };
  if (!Number.isFinite(billAmount) || billAmount < 0) {
    return { ok: false, error: "Enter a valid amount to charge the client." };
  }

  const existingId = input.id ? asUuid(input.id) : null;

  // Status is derived on create only. Recomputing it on every edit would drop
  // an already-invoiced row back to `unbilled` the moment someone fixed a typo
  // in its label — and it would then be billed a second time.
  let status = input.status;
  if (!status) {
    if (existingId) {
      const { data: current } = await db
        .from("project_expenses").select("status").eq("id", existingId).maybeSingle();
      status = current?.status ?? (billAmount > 0 ? "unbilled" : "absorbed");
    } else {
      // Charging nothing IS the absorbed case — recording it as "unbilled"
      // would leave it sitting in the to-bill list forever.
      status = billAmount > 0 ? "unbilled" : "absorbed";
    }
  }

  const row = {
    client_id: clientId,
    project_id: asUuid(input.projectId ?? "") || null,
    category: input.category || "other",
    label,
    vendor: input.vendor?.trim() || null,
    details: input.details?.trim() || null,
    cost,
    bill_amount: billAmount,
    currency: (input.currency || "USD").toUpperCase(),
    incurred_on: input.incurredOn || new Date().toISOString().slice(0, 10),
    renews_on: input.renewsOn || null,
    receipt_url: input.receiptUrl?.trim() || null,
    status,
    visible_to_client: input.visibleToClient ?? true,
  };

  const { data, error } = existingId
    ? await db.from("project_expenses").update(row).eq("id", existingId).select().single()
    : await db.from("project_expenses")
        .insert({ ...row, created_by: me.userId })
        .select()
        .single();

  if (error || !data) {
    console.error("saveExpense failed:", error);
    return {
      ok: false,
      error:
        error?.code === "42P01"
          ? "The expenses table is missing — run supabase/idempotent_fixes_2027_06.sql."
          : error?.message || "Could not save that expense.",
    };
  }

  await recordAudit(me.userId, existingId ? "expense.update" : "expense.create", "project_expenses", data.id, {
    label,
    cost,
    bill_amount: billAmount,
    currency: row.currency,
  });

  // Only announce new items. Editing a typo should not re-email the client.
  if (!existingId && input.notifyClient !== false && row.visible_to_client) {
    await notifyExpense(data).catch((e) => console.error("Expense notice failed:", e));
  }

  revalidatePath(`/${ADMIN}/clients/${clientId}`);
  if (row.project_id) revalidatePath(`/${ADMIN}/projects/${row.project_id}`);
  revalidatePath("/portal");
  return { ok: true, id: data.id };
}

/** Both notices for one recorded extra: the client's copy and the internal one. */
async function notifyExpense(expense: any) {
  const db = createAdminClient();

  const [{ data: client }, { data: project }] = await Promise.all([
    db.from("clients").select("id, name, email").eq("id", expense.client_id).maybeSingle(),
    expense.project_id
      ? db.from("projects").select("name").eq("id", expense.project_id).maybeSingle()
      : Promise.resolve({ data: null as any }),
  ]);

  const categoryLabel = expenseCategoryLabel(expense.category);
  const projectName = project?.name ?? "your account";
  const billed = Number(expense.bill_amount);

  const vars = {
    client_name: client?.name ?? "there",
    project_name: projectName,
    category: categoryLabel,
    item: expense.label,
    vendor: expense.vendor || "—",
    amount: money(billed, expense.currency),
    // Read by the template as a whole sentence so the "we covered this" case
    // does not read as an invoice for zero.
    charge_line:
      billed > 0
        ? `This will appear on your next invoice as ${money(billed, expense.currency)}.`
        : "There is nothing to pay for this — we have covered it.",
    purchased_on: expense.incurred_on,
    renewal_line: expense.renews_on
      ? `This renews on ${expense.renews_on}. We will remind you well before then, so nothing lapses.`
      : "",
    details: expense.details || "",
    receipt_line: expense.receipt_url
      ? `A copy of the receipt is here:\n${expense.receipt_url}`
      : "",
    portal_url: `${getSiteBaseUrl()}/portal`,
  };

  if (client?.email) {
    await sendEmail({
      templateKey: "client_expense_added",
      to: client.email,
      clientId: expense.client_id,
      projectId: expense.project_id ?? undefined,
      vars,
    });
  }

  await sendEmail({
    templateKey: "admin_expense_notice",
    to: await adminNotifyAddress(),
    clientId: expense.client_id,
    projectId: expense.project_id ?? undefined,
    vars: {
      ...vars,
      cost: money(Number(expense.cost), expense.currency),
      margin: money(billed - Number(expense.cost), expense.currency),
      admin_url: `${getSiteBaseUrl()}/${ADMIN}/clients/${expense.client_id}`,
    },
  });
}

export async function deleteExpense(expenseId: string): Promise<Result> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(expenseId);
  if (!id) return { ok: false, error: "Invalid expense reference." };

  const { data: expense } = await db
    .from("project_expenses").select("*").eq("id", id).maybeSingle();
  if (!expense) return { ok: false, error: "That expense no longer exists." };

  // Deleting it would leave an invoice line nothing accounts for.
  if (expense.status === "invoiced" && expense.invoice_id) {
    return {
      ok: false,
      error: "This is already on an invoice. Void or edit that invoice first.",
    };
  }

  const { error } = await db.from("project_expenses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await recordAudit(me.userId, "expense.delete", "project_expenses", id, {
    label: expense.label,
    bill_amount: expense.bill_amount,
  });

  revalidatePath(`/${ADMIN}/clients/${expense.client_id}`);
  if (expense.project_id) revalidatePath(`/${ADMIN}/projects/${expense.project_id}`);
  revalidatePath("/portal");
  return { ok: true };
}

/**
 * Puts the selected extras onto one invoice.
 *
 * One invoice for several items rather than one each — nobody wants four
 * separate invoices for a domain, a licence and two plugins. The rows are
 * stamped with `invoice_id` in the same pass, so a second click cannot bill
 * them twice.
 */
export async function billExpenses(
  clientId: string,
  expenseIds: string[]
): Promise<Result<{ invoiceId: string; invoiceNo: string; count: number }>> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const cid = asUuid(clientId);
  if (!cid) return { ok: false, error: "Invalid client reference." };

  const ids = expenseIds.map((i) => asUuid(i)).filter(Boolean) as string[];
  if (!ids.length) return { ok: false, error: "Select at least one item to bill." };

  const { data: rows, error: readErr } = await db
    .from("project_expenses")
    .select("*")
    .eq("client_id", cid)
    .eq("status", "unbilled")
    .in("id", ids);

  if (readErr) return { ok: false, error: readErr.message };
  if (!rows?.length) {
    return { ok: false, error: "Those items are already billed, or no longer unbilled." };
  }

  // An invoice can only carry one currency. Mixing them silently would produce
  // a wrong total, so refuse and say which currencies clashed.
  const currencies = [...new Set(rows.map((r) => String(r.currency).toUpperCase()))];
  if (currencies.length > 1) {
    return {
      ok: false,
      error: `Those items are in ${currencies.join(" and ")}. Bill one currency at a time.`,
    };
  }

  const billable = rows.filter((r) => Number(r.bill_amount) > 0);
  if (!billable.length) {
    return { ok: false, error: "Every item selected is being absorbed — there is nothing to charge." };
  }

  const currency = currencies[0];
  const total = billable.reduce((s, r) => s + Number(r.bill_amount), 0);

  const { data: invNo, error: noErr } = await db.rpc("next_invoice_no");
  if (noErr || !invNo) {
    return { ok: false, error: "Could not reserve an invoice number. Try again." };
  }

  const { data: invoice, error: invErr } = await db.from("invoices").insert({
    invoice_no: invNo,
    client_id: cid,
    // Only when every item shares one project — otherwise the invoice belongs
    // to the client, not to any single project.
    project_id:
      [...new Set(billable.map((r) => r.project_id))].length === 1
        ? billable[0].project_id
        : null,
    line_items: billable.map((r) => ({
      item: `${expenseCategoryLabel(r.category)} — ${r.label}`,
      qty: 1,
      price: Number(r.bill_amount),
    })),
    // These are reimbursements at cost, already tax-inclusive where it applies.
    subtotal: total,
    tax_percent: 0,
    total,
    currency,
    due_date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    status: "sent",
    notes: "Costs paid on your behalf. Receipts are in your portal.",
  }).select().single();

  if (invErr || !invoice) {
    console.error("billExpenses invoice failed:", invErr);
    return { ok: false, error: invErr?.message || "Could not raise the invoice." };
  }

  const { error: markErr } = await db.from("project_expenses")
    .update({ status: "invoiced", invoice_id: invoice.id })
    .in("id", billable.map((r) => r.id));

  if (markErr) {
    // The invoice exists but the rows are unmarked — say so plainly rather than
    // reporting success and letting them be billed a second time.
    console.error("billExpenses could not mark rows:", markErr);
    return {
      ok: false,
      error: `Invoice ${invoice.invoice_no} was created, but the items could not be marked as billed. Check them before billing again.`,
    };
  }

  const { data: client } = await db
    .from("clients").select("name, email").eq("id", cid).maybeSingle();

  if (client?.email) {
    await sendEmail({
      templateKey: "expenses_invoiced",
      to: client.email,
      clientId: cid,
      attach: { type: "invoice", id: invoice.id },
      vars: {
        client_name: client.name,
        invoice_no: invoice.invoice_no,
        amount: money(total, currency),
        currency,
        due_date: invoice.due_date,
        items: billable
          .map((r) => `• ${r.label} — ${money(Number(r.bill_amount), currency)}`)
          .join("\n"),
        portal_url: `${getSiteBaseUrl()}/portal`,
      },
    }).catch((e) => console.error("Expense invoice email failed:", e));
  }

  await recordAudit(me.userId, "expense.billed", "invoices", invoice.id, {
    count: billable.length,
    total,
    currency,
  });

  revalidatePath(`/${ADMIN}/clients/${cid}`);
  revalidatePath(`/${ADMIN}/invoices`);
  revalidatePath("/portal");
  return { ok: true, invoiceId: invoice.id, invoiceNo: invoice.invoice_no, count: billable.length };
}
