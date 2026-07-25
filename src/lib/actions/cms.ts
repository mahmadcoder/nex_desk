"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const ADMIN = process.env.ADMIN_PATH || "nx-control";

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data: profile } = await supabase.from("profiles")
    .select("id, role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || !["owner", "admin", "staff"].includes(profile.role)) {
    throw new Error("Not authorised");
  }
  return profile;
}

// ---------------- TESTIMONIALS ----------------
export async function saveTestimonial(id: string | null, data: Record<string, unknown>) {
  await requireStaff();
  const db = createAdminClient();
  const res = id
    ? await db.from("testimonials").update(data).eq("id", id).select().single()
    : await db.from("testimonials").insert(data).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/testimonials`);
  revalidatePath("/");
  return res.data;
}

export async function deleteTestimonial(id: string) {
  await requireStaff();
  const db = createAdminClient();
  await db.from("testimonials").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/testimonials`);
  revalidatePath("/");
}

// ---------------- CASE STUDIES / WORK ----------------
export async function saveCaseStudy(id: string | null, data: Record<string, unknown>) {
  await requireStaff();
  const db = createAdminClient();
  const res = id
    ? await db.from("case_studies").update(data).eq("id", id).select().single()
    : await db.from("case_studies").insert(data).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/work`);
  revalidatePath("/work");
  return res.data;
}

export async function deleteCaseStudy(id: string) {
  await requireStaff();
  const db = createAdminClient();
  await db.from("case_studies").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/work`);
  revalidatePath("/work");
}

// ---------------- SERVICES ----------------
export async function saveService(id: string | null, data: Record<string, unknown>) {
  await requireStaff();
  const db = createAdminClient();
  const res = id
    ? await db.from("services").update(data).eq("id", id).select().single()
    : await db.from("services").insert(data).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/services`);
  revalidatePath("/services");
  return res.data;
}

export async function deleteService(id: string) {
  await requireStaff();
  const db = createAdminClient();
  await db.from("services").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/services`);
  revalidatePath("/services");
}

// ---------------- BLOG POSTS ----------------
export async function savePost(id: string | null, data: Record<string, unknown>) {
  await requireStaff();
  const db = createAdminClient();
  const res = id
    ? await db.from("posts").update(data).eq("id", id).select().single()
    : await db.from("posts").insert(data).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/blog`);
  revalidatePath("/blog");
  return res.data;
}

export async function deletePost(id: string) {
  await requireStaff();
  const db = createAdminClient();
  await db.from("posts").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/blog`);
  revalidatePath("/blog");
}

// ---------------- FAQS ----------------
export async function saveFaq(id: string | null, data: Record<string, unknown>) {
  await requireStaff();
  const db = createAdminClient();
  const res = id
    ? await db.from("faqs").update(data).eq("id", id).select().single()
    : await db.from("faqs").insert(data).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/faqs`);
  revalidatePath("/faq");
  return res.data;
}

export async function deleteFaq(id: string) {
  await requireStaff();
  const db = createAdminClient();
  await db.from("faqs").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/faqs`);
  revalidatePath("/faq");
}

// ---------------- EMPLOYEES & JOB TITLES ----------------
import { sendEmail } from "@/lib/email/send";

export async function saveEmployee(id: string | null, data: Record<string, unknown>, language: "en" | "ar" | "fr" | "de" | "es" = "en") {
  const staff = await requireStaff();
  const db = createAdminClient();
  const res = id
    ? await db.from("employees").update(data).eq("id", id).select().single()
    : await db.from("employees").insert(data).select().single();
  if (res.error) throw res.error;

  // Send Joining Email on new employee creation
  if (!id && res.data?.email) {
    try {
      await sendEmail({
        templateKey: "employee_joining",
        language,
        to: String(res.data.email),
        vars: {
          employee_name: String(res.data.full_name ?? "Team Member"),
          job_title: String(res.data.job_title ?? "Specialist"),
          seniority: String(res.data.seniority ?? "Senior"),
          city: String(res.data.city ?? "Remote"),
          country: String(res.data.country ?? "Global"),
          joining_date: String(res.data.joining_date ?? new Date().toISOString().slice(0, 10)),
        },
        actorId: staff.id,
      });
    } catch {
      /* email failed silently */
    }
  }

  revalidatePath(`/${ADMIN}/employees`);
  if (id) revalidatePath(`/${ADMIN}/employees/${id}`);
  return res.data;
}

export async function deleteEmployee(id: string) {
  await requireStaff();
  const db = createAdminClient();
  await db.from("employees").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/employees`);
}

export async function saveJobTitle(id: string | null, data: Record<string, unknown>) {
  await requireStaff();
  const db = createAdminClient();
  const res = id
    ? await db.from("employee_job_titles").update(data).eq("id", id).select().single()
    : await db.from("employee_job_titles").insert(data).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/employees`);
  return res.data;
}

export async function deleteJobTitle(id: string) {
  await requireStaff();
  const db = createAdminClient();
  await db.from("employee_job_titles").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/employees`);
}

export async function assignEmployeeToClient(clientId: string, employeeId: string, projectId?: string) {
  await requireStaff();
  const db = createAdminClient();
  const { data, error } = await db.from("client_employee_assignments").insert({
    client_id: clientId,
    employee_id: employeeId,
    project_id: projectId ?? null,
  }).select().single();
  if (error) throw error;
  revalidatePath(`/${ADMIN}/clients/${clientId}`);
  revalidatePath(`/${ADMIN}/employees/${employeeId}`);
  revalidatePath("/portal");
  return data;
}

export async function removeEmployeeFromClient(assignmentId: string, clientId?: string, employeeId?: string) {
  await requireStaff();
  const db = createAdminClient();
  await db.from("client_employee_assignments").delete().eq("id", assignmentId);
  if (clientId) revalidatePath(`/${ADMIN}/clients/${clientId}`);
  if (employeeId) revalidatePath(`/${ADMIN}/employees/${employeeId}`);
  revalidatePath("/portal");
}
