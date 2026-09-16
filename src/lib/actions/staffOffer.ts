"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/staff";
import { recordAudit } from "@/lib/actions/audit";
import { notify } from "@/lib/actions/notify";

import { StaffOfferAcceptance, parseOfferAcceptance } from "@/lib/staffOffer";
export type { StaffOfferAcceptance };
export { parseOfferAcceptance };

/**
 * Gets the offer letter acceptance status for an employee.
 */
export async function getStaffOfferStatus(employeeId: string): Promise<StaffOfferAcceptance> {
  const db = createAdminClient();
  const { data: employee } = await db
    .from("employees")
    .select("notes")
    .eq("id", employeeId)
    .maybeSingle();

  return parseOfferAcceptance(employee?.notes);
}

/**
 * Staff digitally signs and accepts their official offer letter.
 */
export async function acceptStaffOfferLetter(
  typedName: string,
  signatureDataUrl?: string | null
): Promise<{ ok: true; acceptedAt: string } | { ok: false; error: string }> {
  try {
    const me = await getCurrentStaff();
    if (!me || !me.employeeId) {
      return { ok: false, error: "You must be signed in as an employee to accept an offer letter." };
    }

    const cleanName = typedName?.trim() || "";
    if (cleanName.length < 3) {
      return { ok: false, error: "Please type your full legal name to accept." };
    }

    const db = createAdminClient();
    const { data: employee } = await db
      .from("employees")
      .select("id, full_name, email, job_title, notes")
      .eq("id", me.employeeId)
      .single();

    if (!employee) {
      return { ok: false, error: "Employee record not found." };
    }

    const currentStatus = parseOfferAcceptance(employee.notes);
    if (currentStatus.isAccepted) {
      return { ok: false, error: "Your offer letter has already been accepted." };
    }

    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0].trim() ||
      h.get("x-real-ip") ||
      null;
    const userAgent = h.get("user-agent")?.slice(0, 300) ?? null;

    let existingObj: Record<string, any> = {};
    if (typeof employee.notes === "string" && employee.notes.trim().startsWith("{")) {
      try {
        existingObj = JSON.parse(employee.notes);
      } catch {
        existingObj = { admin_notes: employee.notes };
      }
    } else if (typeof employee.notes === "object" && employee.notes !== null) {
      existingObj = employee.notes;
    } else if (employee.notes) {
      existingObj = { admin_notes: employee.notes };
    }

    const acceptedAt = new Date().toISOString();
    const updatedNotes = {
      ...existingObj,
      offer_letter: {
        accepted_at: acceptedAt,
        signed_name: cleanName,
        signature_data: signatureDataUrl || null,
        ip,
        user_agent: userAgent,
      },
    };

    const { error: updateError } = await db
      .from("employees")
      .update({ notes: JSON.stringify(updatedNotes) })
      .eq("id", me.employeeId);

    if (updateError) {
      return { ok: false, error: updateError.message || "Failed to save acceptance." };
    }

    await recordAudit(
      me.userId,
      "employee.offer_accepted",
      "employees",
      me.employeeId,
      {
        employee_name: employee.full_name,
        signed_name: cleanName,
        accepted_at: acceptedAt,
        ip,
      }
    );

    // Notify admins that the employee accepted their offer
    await notify({
      kind: "offer.accepted",
      title: `${employee.full_name} accepted offer letter`,
      body: `${employee.full_name} has reviewed and digitally accepted their offer letter for ${employee.job_title}.`,
      href: `/nx-control/employees/${me.employeeId}`,
      audience: "admins",
    });

    const ADMIN = process.env.ADMIN_PATH || "nx-control";
    revalidatePath(`/${ADMIN}`);
    revalidatePath(`/${ADMIN}/profile`);
    revalidatePath(`/${ADMIN}/employees`);
    revalidatePath(`/${ADMIN}/employees/${me.employeeId}`);

    return { ok: true, acceptedAt };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to process acceptance." };
  }
}
