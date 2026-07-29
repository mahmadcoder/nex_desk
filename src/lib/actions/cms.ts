"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const ADMIN = process.env.ADMIN_PATH || "nx-control";

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from("profiles")
      .select("id, role, is_active").eq("id", user.id).maybeSingle();
    if (profile?.is_active && ["owner", "admin", "staff"].includes(profile.role)) {
      return profile;
    }
  }

  // Check admin session cookie (nx_admin_login_at) or development mode
  const cookieStore = await cookies();
  const adminLogin = cookieStore.get("nx_admin_login_at")?.value;
  if (adminLogin || process.env.NODE_ENV === "development") {
    return { id: user?.id || "admin-session", role: "owner", is_active: true };
  }

  throw new Error("Not signed in");
}

// ---------------- TESTIMONIALS ----------------
export async function saveTestimonial(id: string | null, data: Record<string, unknown>) {
  await requireStaff();
  const db = createAdminClient();
  const cleanId = id && String(id).trim() !== "" ? String(id) : null;

  // Remove undefined or null id from insert payload
  const { id: _, ...payload } = data;

  const res = cleanId
    ? await db.from("testimonials").update(payload).eq("id", cleanId).select().single()
    : await db.from("testimonials").insert(payload).select().single();

  if (res.error) throw new Error(res.error.message || "Failed to save testimonial.");
  revalidatePath(`/${ADMIN}/testimonials`);
  revalidatePath("/");
  revalidatePath("/about");
  return res.data;
}

export async function toggleTestimonialPublished(id: string, is_published: boolean) {
  await requireStaff();
  const db = createAdminClient();
  const res = await db.from("testimonials").update({ is_published }).eq("id", id).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/testimonials`);
  revalidatePath("/");
  revalidatePath("/about");
  return res.data;
}

export async function deleteTestimonial(id: string) {
  await requireStaff();
  const db = createAdminClient();
  await db.from("testimonials").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/testimonials`);
  revalidatePath("/");
  revalidatePath("/about");
}

export async function seedDefaultTestimonials() {
  await requireStaff();
  const db = createAdminClient();
  const SAMPLE_QUOTES = [
    { client_name: "Ayesha Khan", role: "Founder", company: "Lumen Studio", rating: 5, is_published: true, sort_order: 1, quote: "They shipped in four weeks what two previous agencies couldn't in six months. The staging link from day one meant no surprises." },
    { client_name: "Daniel Reeve", role: "CEO", company: "Northwind", rating: 5, is_published: true, sort_order: 2, quote: "The written scope saved us. Everyone knew exactly what was being built and what it cost. No arguments at the end." },
    { client_name: "Priya Nair", role: "Head of Growth", company: "Vertex", rating: 5, is_published: true, sort_order: 3, quote: "Our organic traffic tripled in three months. They actually explained what they were doing instead of hiding behind jargon." },
    { client_name: "Marco Bianchi", role: "Owner", company: "Práctica", rating: 5, is_published: true, sort_order: 4, quote: "The receipt and agreement PDFs made us look far bigger than we are. Clients take us seriously now." },
    { client_name: "Sana Malik", role: "Director", company: "Kavi", rating: 5, is_published: true, sort_order: 5, quote: "Weekly progress emails I never had to ask for. I always knew where the project stood." },
    { client_name: "Tom Alvarez", role: "Co-founder", company: "Orbit", rating: 5, is_published: true, sort_order: 6, quote: "We own everything — code, files, accounts. No lock-in, no hostage situation. Rare in this business." },
    { client_name: "Hina Farooq", role: "Marketing Lead", company: "Fathom", rating: 5, is_published: true, sort_order: 7, quote: "The ad campaigns hit the cost-per-lead target they promised in the first month. Straight talk, real numbers." },
  ];

  const { error } = await db.from("testimonials").upsert(SAMPLE_QUOTES, { onConflict: "client_name" });
  if (error) {
    // If upsert on client_name isn't unique constraint, fallback to insert
    const { error: insertErr } = await db.from("testimonials").insert(SAMPLE_QUOTES);
    if (insertErr) throw insertErr;
  }

  revalidatePath(`/${ADMIN}/testimonials`);
  revalidatePath("/");
  revalidatePath("/about");
  return { success: true, count: SAMPLE_QUOTES.length };
}

// ---------------- CASE STUDIES / WORK ----------------
export async function saveCaseStudy(id: string | null, data: Record<string, unknown>) {
  await requireStaff();
  const db = createAdminClient();
  const cleanId = id && String(id).trim() !== "" ? String(id) : null;
  const { id: _, ...payload } = data;

  const res = cleanId
    ? await db.from("case_studies").update(payload).eq("id", cleanId).select().single()
    : await db.from("case_studies").insert(payload).select().single();

  if (res.error) throw new Error(res.error.message || "Failed to save case study.");
  revalidatePath(`/${ADMIN}/work`);
  revalidatePath("/work");
  revalidatePath("/");
  return res.data;
}

export async function toggleCaseStudyPublished(id: string, is_published: boolean) {
  await requireStaff();
  const db = createAdminClient();
  const res = await db.from("case_studies").update({ is_published }).eq("id", id).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/work`);
  revalidatePath("/work");
  revalidatePath("/");
  return res.data;
}

export async function deleteCaseStudy(id: string) {
  await requireStaff();
  const db = createAdminClient();
  await db.from("case_studies").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/work`);
  revalidatePath("/work");
  revalidatePath("/");
}

export async function seedDefaultCaseStudies() {
  await requireStaff();
  const db = createAdminClient();
  const DEFAULT_STUDIES = [
    {
      slug: "northwind-saas",
      title: "SaaS Multi-Tenant Platform Overhaul",
      client_name: "Northwind Inc.",
      industry: "B2B Software",
      cover_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
      outcome: "Scaled platform to 45,000 monthly active users with 99.99% uptime and sub-200ms API response time.",
      metrics: [{ label: "User Growth", value: "+240%" }, { label: "Page Load Speed", value: "0.4s" }],
      tech_stack: ["Next.js", "TypeScript", "TailwindCSS", "Supabase", "Stripe"],
      live_url: "https://example.com",
      is_featured: true,
      is_published: true,
      sort_order: 1,
    },
    {
      slug: "lumen-brand-design",
      title: "Lumen Studio E-Commerce & Brand Identity",
      client_name: "Lumen Studio",
      industry: "Design & E-Commerce",
      cover_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
      outcome: "Designed pixel-perfect design system and custom Shopify storefront boosting checkout conversions by 38%.",
      metrics: [{ label: "Checkout Conversion", value: "+38%" }, { label: "Lighthouse Score", value: "98/100" }],
      tech_stack: ["Shopify", "React", "TailwindCSS", "Figma"],
      live_url: "https://example.com",
      is_featured: true,
      is_published: true,
      sort_order: 2,
    },
    {
      slug: "vertex-seo-growth",
      title: "Vertex Organic Traffic Engine",
      client_name: "Vertex Analytics",
      industry: "Fintech",
      cover_url: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1200&q=80",
      outcome: "Technical SEO optimization and content architecture engine generating 120,000+ organic monthly visitors.",
      metrics: [{ label: "Organic Visitors", value: "120K/mo" }, { label: "Domain Rating", value: "68 DR" }],
      tech_stack: ["Next.js", "GA4", "Search Console", "Ahrefs"],
      live_url: "https://example.com",
      is_featured: true,
      is_published: true,
      sort_order: 3,
    },
  ];

  const { error } = await db.from("case_studies").upsert(DEFAULT_STUDIES, { onConflict: "slug" });
  if (error) throw error;

  revalidatePath(`/${ADMIN}/work`);
  revalidatePath("/work");
  revalidatePath("/");
  return { success: true, count: DEFAULT_STUDIES.length };
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
  const cleanId = id && String(id).trim() !== "" ? String(id) : null;
  const { id: _, ...payload } = data;

  const res = cleanId
    ? await db.from("faqs").update(payload).eq("id", cleanId).select().single()
    : await db.from("faqs").insert(payload).select().single();

  if (res.error) throw new Error(res.error.message || "Failed to save FAQ.");
  revalidatePath(`/${ADMIN}/faqs`);
  revalidatePath("/");
  revalidatePath("/faq");
  return res.data;
}

export async function toggleFaqActive(id: string, is_active: boolean) {
  await requireStaff();
  const db = createAdminClient();
  const res = await db.from("faqs").update({ is_active }).eq("id", id).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/faqs`);
  revalidatePath("/");
  revalidatePath("/faq");
  return res.data;
}

export async function deleteFaq(id: string) {
  await requireStaff();
  const db = createAdminClient();
  await db.from("faqs").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/faqs`);
  revalidatePath("/");
  revalidatePath("/faq");
}

export async function seedDefaultFaqs() {
  await requireStaff();
  const db = createAdminClient();
  const DEFAULT_FAQS = [
    { question: "How do we start?", category: "General", sort_order: 1, is_active: true, answer: "Send us a message with what you need. We reply within one working day, get on a short call, then send a written proposal with scope, price and timeline. Once you approve it, we lock the deal and send a signed agreement PDF by email." },
    { question: "What do you need from me to begin?", category: "General", sort_order: 2, is_active: true, answer: "Your logo and brand files if you have them, your content or a rough draft of it, access to your domain and hosting, and one dedicated point of contact on your side who can approve deliverables." },
    { question: "How fast can you complete my project?", category: "Delivery", sort_order: 3, is_active: true, answer: "Most website and branding projects ship within 2 to 4 weeks. Custom web applications and mobile apps take 6 to 12 weeks depending on scope. We lock exact timeline milestones in writing before starting." },
    { question: "How does payment work?", category: "Pricing", sort_order: 4, is_active: true, answer: "Typically 50% advance to start and 50% on delivery. Larger projects can be split across key milestones. Every payment receives an automated invoice and receipt PDF with clear references." },
    { question: "What if I need something outside the agreed scope?", category: "Scope", sort_order: 5, is_active: true, answer: "We issue a clear change order detailing the additional cost and timeline impact. Nothing is added silently and nothing is billed without your explicit written approval." },
    { question: "Do I own the code and design files?", category: "Ownership", sort_order: 6, is_active: true, answer: "Yes. Full ownership of all source code, Figma design files, graphics, and account credentials transfers entirely to you once the final payment clears." },
    { question: "What technologies do you use?", category: "Technical", sort_order: 7, is_active: true, answer: "We build modern, high-performance applications using Next.js, React, React Native, TypeScript, Tailwind CSS, Node.js, and Supabase — guaranteeing 90+ Lighthouse speed scores and clean maintainable code." },
    { question: "What happens after launch?", category: "Support", sort_order: 8, is_active: true, answer: "You get 30 days of free post-launch support for bug fixes. After that, an optional monthly retainer covers regular updates, backups, security monitoring, and allocated development hours." },
  ];

  const { error } = await db.from("faqs").upsert(DEFAULT_FAQS, { onConflict: "question" });
  if (error) {
    const { error: insertErr } = await db.from("faqs").insert(DEFAULT_FAQS);
    if (insertErr) throw insertErr;
  }

  revalidatePath(`/${ADMIN}/faqs`);
  revalidatePath("/");
  revalidatePath("/faq");
  return { success: true, count: DEFAULT_FAQS.length };
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

  // Send Joining Email on new employee creation in non-blocking background task
  if (!id && res.data?.email) {
    sendEmail({
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
    }).catch((emailErr) => console.error("Employee joining email failed in background:", emailErr));
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

export async function updateAssignedEmployee(assignmentId: string, newEmployeeId: string, clientId?: string) {
  await requireStaff();
  const db = createAdminClient();
  const { error } = await db.from("client_employee_assignments").update({ employee_id: newEmployeeId }).eq("id", assignmentId);
  if (error) throw error;
  if (clientId) revalidatePath(`/${ADMIN}/clients/${clientId}`);
  revalidatePath("/portal");
}

// ---------------- CLIENT SIGNED DOCUMENT UPLOADS ----------------
export async function uploadClientSignedDocument(data: {
  clientId: string;
  title: string;
  storagePath: string;
  documentType?: string;
}) {
  const db = createAdminClient();
  const { data: res, error } = await db.from("documents").insert({
    client_id: data.clientId,
    title: data.title,
    storage_path: data.storagePath,
    uploaded_by_client: true,
    document_type: data.documentType || "signed_agreement",
  }).select().single();

  if (error) throw new Error(error.message || "Failed to upload document.");

  const adminEmail = process.env.GMAIL_USER || "ahmadsadiq.dev@gmail.com";
  db.from("clients").select("name, email").eq("id", data.clientId).maybeSingle().then(({ data: clientObj }) => {
    sendEmail({
      templateKey: "admin_document_uploaded_notice",
      to: adminEmail,
      vars: { client_name: clientObj?.name || "Client", doc_title: data.title },
      bodyOverride: `Hello Admin,\n\nClient "${clientObj?.name || "A client"}" (${clientObj?.email || ""}) has uploaded a signed document:\n\n• Title: ${data.title}\n• Document Type: ${data.documentType || "Signed Agreement"}\n• Date: ${new Date().toLocaleString()}\n\nYou can view and download this document from your Admin Document Center (/nx-control/documents).`,
      subjectOverride: `Signed Document Uploaded: ${data.title} by ${clientObj?.name || "Client"}`,
    }).catch((emailErr) => console.error("Error sending document upload notice email:", emailErr));
  });

  revalidatePath("/portal");
  revalidatePath(`/${ADMIN}/documents`);
  revalidatePath(`/${ADMIN}/clients/${data.clientId}`);
  return res;
}

// ---------------- DAILY WORK LOGS ----------------
export async function submitDailyWorkLog(data: {
  employee_id?: string | null;
  employee_name?: string | null;
  project_id?: string | null;
  project_title?: string | null;
  work_date: string;
  hours_spent: number;
  tasks_completed: string;
  blockers?: string | null;
  proof_url?: string | null;
}) {
  const db = createAdminClient();
  const { data: res, error } = await db.from("daily_work_logs").insert({
    employee_id: data.employee_id || null,
    employee_name: data.employee_name || null,
    project_id: data.project_id || null,
    project_title: data.project_title || null,
    work_date: data.work_date,
    hours_spent: data.hours_spent,
    tasks_completed: data.tasks_completed,
    blockers: data.blockers || null,
    proof_url: data.proof_url || null,
  }).select().single();

  if (error) throw new Error(error.message || "Failed to submit daily work log.");

  const adminEmail = process.env.GMAIL_USER || "ahmadsadiq.dev@gmail.com";
  sendEmail({
    templateKey: "admin_work_log_notice",
    to: adminEmail,
    vars: {
      employee_name: data.employee_name || "Staff Member",
      project_title: data.project_title || "General Task",
    },
    bodyOverride: `Hello Admin,\n\nA new Daily Work Log has been submitted:\n\n• Staff Member: ${data.employee_name || "N/A"}\n• Assigned Project: ${data.project_title || "N/A"}\n• Work Date: ${data.work_date}\n• Hours Spent: ${data.hours_spent} hrs\n• Tasks Completed:\n${data.tasks_completed}${data.blockers ? `\n\n• Blockers / Assistance Needed:\n${data.blockers}` : ""}\n\nYou can review all daily logs at /nx-control/daily-logs.`,
    subjectOverride: `Daily Work Log Submitted by ${data.employee_name || "Staff Member"} (${data.work_date})`,
  }).catch((emailErr) => console.error("Error sending work log notice email:", emailErr));

  revalidatePath(`/${ADMIN}/daily-logs`);
  revalidatePath(`/${ADMIN}/employees`);
  revalidatePath(`/${ADMIN}/projects`);
  return res;
}

export async function deleteDailyWorkLog(id: string) {
  await requireStaff();
  const db = createAdminClient();
  const { error } = await db.from("daily_work_logs").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/${ADMIN}/daily-logs`);
}

export async function uploadPublicAsset(formData: FormData): Promise<{ url?: string; error?: string }> {
  await requireStaff();
  const file = formData.get("file") as File;
  const folder = (formData.get("folder") as string) || "uploads";

  if (!file) return { error: "No file provided." };

  try {
    const db = createAdminClient();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileExt = file.name.split(".").pop() || "png";
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

    const { error: uploadError } = await db.storage
      .from("public-assets")
      .upload(fileName, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase Storage admin upload error:", uploadError);
      // Fallback to WebP base64 data URL if storage bucket fails
      const base64 = buffer.toString("base64");
      const mime = file.type || "image/jpeg";
      return { url: `data:${mime};base64,${base64}` };
    }

    const { data: publicData } = db.storage
      .from("public-assets")
      .getPublicUrl(fileName);

    return { url: publicData.publicUrl };
  } catch (err: any) {
    console.error("uploadPublicAsset error:", err);
    return { error: err.message || "Failed to upload image." };
  }
}

