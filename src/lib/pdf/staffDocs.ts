import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { StaffOfferLetterDoc, PayslipDoc } from "./documents";
import { getAgency } from "@/lib/agency";
import { setDocAgency } from "./parts";

/**
 * Staff-facing documents.
 *
 * Deliberately separate from `generateDocument`. That path records every PDF in
 * the `documents` table, which is built around clients: `type` is a NOT NULL
 * enum with no staff value and `client_id` shapes the storage path. An offer
 * letter belongs to an employee, not a client, so it is rendered on demand and
 * never stored — the employee row it is generated from is the record of truth,
 * and re-running this always reflects the current terms.
 */

export async function buildStaffOfferPdf(employeeId: string) {
  const db = createAdminClient();

  const { data: employee } = await db
    .from("employees").select("*").eq("id", employeeId).single();
  if (!employee) throw new Error("Employee not found");

  const element = createElement(StaffOfferLetterDoc, { employee });
  setDocAgency(await getAgency());
  const buffer = await renderToBuffer(element as any);

  const safeName = String(employee.full_name || "employee")
    .replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");

  return {
    buffer,
    filename: `Nex-Desk-Offer-Letter-${safeName}.pdf`,
    title: `Offer letter — ${employee.full_name}`,
    employee,
  };
}

/**
 * A payslip for one recorded payment.
 *
 * Rendered on demand and never stored, for the same reason as the offer letter:
 * `documents.type` is a client-facing enum with no staff value, and the payment
 * row is the record of truth anyway. Correcting a bonus reissues this
 * automatically rather than leaving a stale PDF in a bucket.
 */
export async function buildStaffPayslipPdf(paymentId: string) {
  const db = createAdminClient();

  const { data: payment } = await db
    .from("salary_payments")
    .select("*, employees(id, full_name, email, job_title, employment_type, salary_currency)")
    .eq("id", paymentId)
    .single();

  if (!payment) throw new Error("Payment not found");

  const employee = (payment as any).employees;
  if (!employee) throw new Error("That payment is not attached to an employee");

  const element = createElement(PayslipDoc, { payment, employee });
  setDocAgency(await getAgency());
  const buffer = await renderToBuffer(element as any);

  const period = new Date(payment.period_month).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
  const safeName = String(employee.full_name || "employee")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return {
    buffer,
    filename: `Nex-Desk-Payslip-${safeName}-${period.replace(/\s+/g, "-")}.pdf`,
    title: `Payslip — ${employee.full_name} — ${period}`,
    employeeId: employee.id as string,
  };
}
