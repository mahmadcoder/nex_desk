"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStaff, requireOwnerAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/actions/audit";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/* ============================================================
   DEPARTMENTS
   ============================================================ */

export async function saveDepartment(input: { id?: string; name: string; leadId?: string | null }) {
  const me = await requireOwnerAdmin();
  const name = input.name?.trim();
  if (!name) return { ok: false as const, error: "Give the department a name." };

  const db = createAdminClient();
  const payload = { name, lead_id: input.leadId || null };

  const { error } = input.id
    ? await db.from("departments").update(payload).eq("id", input.id)
    : await db.from("departments").insert(payload);

  if (error) {
    return {
      ok: false as const,
      error:
        error.code === "42P01"
          ? "Departments need their table — run supabase/idempotent_fixes_2027_30.sql."
          : error.code === "23505"
            ? "There is already a department with that name."
            : error.message,
    };
  }

  await recordAudit(me.userId, input.id ? "department.update" : "department.create", "departments", input.id, { name });
  revalidatePath(`/${ADMIN}/hr`);
  revalidatePath(`/${ADMIN}/employees`);
  return { ok: true as const };
}

/**
 * Remove a department.
 *
 * `employees.department_id` is `on delete set null`, so the people survive and
 * simply become unassigned — deleting an org unit must never delete staff
 * records, and a cascade here would do exactly that.
 */
export async function deleteDepartment(id: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const { count } = await db
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("department_id", id);

  const { error } = await db.from("departments").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await recordAudit(me.userId, "department.delete", "departments", id, { orphaned: count ?? 0 });
  revalidatePath(`/${ADMIN}/hr`);
  revalidatePath(`/${ADMIN}/employees`);
  return { ok: true as const, orphaned: count ?? 0 };
}

/* ============================================================
   HOLIDAYS
   ============================================================ */

export async function addHoliday(input: { date: string; name: string; note?: string | null }) {
  const me = await requireOwnerAdmin();
  if (!input.date) return { ok: false as const, error: "Pick a date." };
  if (!input.name?.trim()) return { ok: false as const, error: "Name the holiday." };

  const { error } = await createAdminClient().from("holidays").insert({
    holiday_on: input.date,
    name: input.name.trim(),
    note: input.note?.trim() || null,
  });

  if (error) {
    return {
      ok: false as const,
      error:
        error.code === "42P01"
          ? "Holidays need their table — run supabase/idempotent_fixes_2027_30.sql."
          : error.code === "23505"
            ? "That date is already marked as a holiday."
            : error.message,
    };
  }

  await recordAudit(me.userId, "holiday.add", "holidays", null, { date: input.date, name: input.name });
  revalidatePath(`/${ADMIN}/hr`);
  revalidatePath(`/${ADMIN}/attendance`);
  return { ok: true as const };
}

export async function deleteHoliday(id: string) {
  const me = await requireOwnerAdmin();
  const { error } = await createAdminClient().from("holidays").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await recordAudit(me.userId, "holiday.delete", "holidays", id);
  revalidatePath(`/${ADMIN}/hr`);
  revalidatePath(`/${ADMIN}/attendance`);
  return { ok: true as const };
}

/**
 * Holidays in a date range, as a date → name map.
 *
 * Read by every attendance surface. Degrades to an empty map before the
 * migration rather than breaking the grid.
 */
export async function holidayMap(from: string, to: string): Promise<Record<string, string>> {
  try {
    const { data, error } = await createAdminClient()
      .from("holidays")
      .select("holiday_on, name")
      .gte("holiday_on", from)
      .lte("holiday_on", to);

    if (error) {
      if (error.code !== "42P01") console.error("holidayMap failed", error);
      return {};
    }
    return Object.fromEntries((data ?? []).map((h) => [h.holiday_on, h.name]));
  } catch {
    return {};
  }
}

/* ============================================================
   RECRUITMENT
   ============================================================ */

export async function saveApplicant(input: {
  id?: string;
  fullName: string;
  email: string;
  phone?: string | null;
  roleApplied: string;
  departmentId?: string | null;
  source?: string | null;
  cvUrl?: string | null;
  portfolioUrl?: string | null;
  expectedSalary?: number | null;
  currency?: string | null;
  notes?: string | null;
}) {
  const me = await requireOwnerAdmin();
  if (!input.fullName?.trim()) return { ok: false as const, error: "Name required." };
  if (!input.email?.trim()) return { ok: false as const, error: "Email required." };
  if (!input.roleApplied?.trim()) return { ok: false as const, error: "Which role?" };

  const payload = {
    full_name: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    role_applied: input.roleApplied.trim(),
    department_id: input.departmentId || null,
    source: input.source?.trim() || null,
    cv_url: input.cvUrl?.trim() || null,
    portfolio_url: input.portfolioUrl?.trim() || null,
    expected_salary: input.expectedSalary ?? null,
    currency: input.currency || "USD",
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const db = createAdminClient();
  const { error } = input.id
    ? await db.from("applicants").update(payload).eq("id", input.id)
    : await db.from("applicants").insert(payload);

  if (error) {
    return {
      ok: false as const,
      error:
        error.code === "42P01"
          ? "Recruitment needs its table — run supabase/idempotent_fixes_2027_30.sql."
          : error.message,
    };
  }

  await recordAudit(me.userId, input.id ? "applicant.update" : "applicant.create", "applicants", input.id, {
    name: payload.full_name,
    role: payload.role_applied,
  });
  revalidatePath(`/${ADMIN}/recruitment`);
  return { ok: true as const };
}

export async function setApplicantStage(id: string, stage: string) {
  const me = await requireOwnerAdmin();

  const allowed = ["applied", "screening", "interview", "offer", "hired", "rejected"];
  if (!allowed.includes(stage)) return { ok: false as const, error: "Unknown stage." };

  // `hired` is not a stage you can simply set — it means an employee record
  // exists, which only `hireApplicant` can create. Letting it be typed in by
  // hand would produce someone marked hired with no account, no salary and no
  // way to log in.
  if (stage === "hired") {
    return { ok: false as const, error: "Use Hire, so an employee record is actually created." };
  }

  const { error } = await createAdminClient()
    .from("applicants")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  await recordAudit(me.userId, "applicant.stage", "applicants", id, { stage });
  revalidatePath(`/${ADMIN}/recruitment`);
  return { ok: true as const };
}

/**
 * Turn an applicant into an employee.
 *
 * The one action that crosses from recruitment into HR, so it is the one that
 * has to be careful: it refuses if this application already produced an
 * employee, and refuses if the email is already on the team.
 */
export async function hireApplicant(id: string, startDate?: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const { data: a } = await db.from("applicants").select("*").eq("id", id).maybeSingle();
  if (!a) return { ok: false as const, error: "That applicant no longer exists." };
  if (a.employee_id) return { ok: false as const, error: "This applicant has already been hired." };

  const { data: clash } = await db
    .from("employees")
    .select("id")
    .ilike("email", a.email)
    .maybeSingle();
  if (clash) {
    return { ok: false as const, error: "Someone with that email is already an employee." };
  }

  const { data: employee, error } = await db
    .from("employees")
    .insert({
      full_name: a.full_name,
      email: a.email,
      phone: a.phone,
      job_title: a.role_applied,
      department_id: a.department_id,
      salary_amount: a.expected_salary ?? 0,
      salary_currency: a.currency ?? "USD",
      joining_date: startDate || new Date().toISOString().slice(0, 10),
      status: "Active",
      notes: a.notes,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  // Stage and link together, so a crash between them cannot leave an applicant
  // marked hired with nothing to point at.
  await db
    .from("applicants")
    .update({ stage: "hired", employee_id: employee.id, updated_at: new Date().toISOString() })
    .eq("id", id);

  await recordAudit(me.userId, "applicant.hired", "employees", employee.id, {
    applicant_id: id,
    name: a.full_name,
  });

  revalidatePath(`/${ADMIN}/recruitment`);
  revalidatePath(`/${ADMIN}/employees`);
  return { ok: true as const, employeeId: employee.id as string };
}

export async function deleteApplicant(id: string) {
  const me = await requireOwnerAdmin();
  const { error } = await createAdminClient().from("applicants").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await recordAudit(me.userId, "applicant.delete", "applicants", id);
  revalidatePath(`/${ADMIN}/recruitment`);
  return { ok: true as const };
}

/** Departments with their headcount, for the HR page and pickers. */
export async function listDepartments() {
  await requireStaff();
  const db = createAdminClient();

  const [{ data: departments, error }, { data: staff }] = await Promise.all([
    db.from("departments").select("*, employees!departments_lead_id_fkey(full_name)").order("sort_order").order("name"),
    db.from("employees").select("department_id").neq("status", "Terminated"),
  ]);

  if (error) {
    if (error.code !== "42P01") console.error("listDepartments failed", error);
    return [];
  }

  const counts = new Map<string, number>();
  for (const e of staff ?? []) {
    if (e.department_id) counts.set(e.department_id, (counts.get(e.department_id) ?? 0) + 1);
  }

  return (departments ?? []).map((d: any) => ({
    ...d,
    headcount: counts.get(d.id) ?? 0,
    leadName: d.employees?.full_name ?? null,
  }));
}
