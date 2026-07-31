import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { StaffOfferLetterDoc } from "./documents";

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
