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
  revalidatePath("/pricing");
  revalidatePath("/");
  return res.data;
}

export async function toggleServiceActive(id: string, is_active: boolean) {
  await requireStaff();
  const db = createAdminClient();
  const res = await db.from("services").update({ is_active }).eq("id", id).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/services`);
  revalidatePath("/services");
  revalidatePath("/pricing");
  revalidatePath("/");
  return res.data;
}

export async function deleteService(id: string) {
  await requireStaff();
  const db = createAdminClient();
  await db.from("services").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/services`);
  revalidatePath("/services");
  revalidatePath("/pricing");
  revalidatePath("/");
}

export async function seedDefaultServices() {
  await requireStaff();
  const { demoServices } = await import("@/lib/agencyData");
  const db = createAdminClient();

  const toInsert = demoServices.map((s, idx) => ({
    slug: s.slug,
    title: s.title,
    category: s.category,
    short_desc: s.short_desc,
    starting_at: s.starting_at,
    currency: s.currency || "USD",
    is_featured: (s as any).is_featured ?? true,
    is_active: true,
    sort_order: idx + 1,
    pricing_tiers: [
      {
        key: "basic",
        name: "Starter Package",
        price: s.starting_at || 1500,
        price_label: s.starting_at ? `$${s.starting_at.toLocaleString()}` : "$1,500",
        short_desc: "Essential build for startups & single core product launch.",
        delivery_time: "1–2 weeks delivery",
        features: [
          "Core feature build & responsive design",
          "Sub-second page load performance",
          "Mobile & Desktop optimization",
          "100% Code & Asset ownership",
          "2 weeks post-launch support",
        ],
        is_popular: false,
        cta_text: "Select Starter Package",
      },
      {
        key: "standard",
        name: "Growth Package",
        price: (s.starting_at || 1500) * 2,
        price_label: `$${((s.starting_at || 1500) * 2).toLocaleString()}`,
        short_desc: "Complete production application with advanced features & integrations.",
        delivery_time: "2–4 weeks delivery",
        features: [
          "Everything in Starter Package",
          "Custom database & authentication integration",
          "Advanced admin control panel & dashboard",
          "GA4 Analytics & SEO optimization",
          "Priority API & webhook pipelines",
          "30 days dedicated warranty support",
        ],
        is_popular: true,
        cta_text: "Select Growth Package",
      },
      {
        key: "enterprise",
        name: "Enterprise Architecture",
        price: null,
        price_label: "Custom Quote",
        short_desc: "Tailored multi-team architecture, custom SLA, and dedicated engineering squad.",
        delivery_time: "Custom timeline",
        features: [
          "Everything in Growth Package",
          "Dedicated senior lead engineer & designer",
          "Multi-tenant & high-availability DB setup",
          "Security audit & SOC2 compliance prep",
          "Custom SLA & 24/7 emergency retainer",
        ],
        is_popular: false,
        cta_text: "Request Enterprise Quote",
      },
    ],
  }));

  const { error } = await db.from("services").upsert(toInsert, { onConflict: "slug" });
  if (error) throw error;

  revalidatePath(`/${ADMIN}/services`);
  revalidatePath("/services");
  revalidatePath("/pricing");
  revalidatePath("/");
  return { success: true, count: toInsert.length };
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
