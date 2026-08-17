"use server";

import { revalidatePath } from "next/cache";
import { notify } from "@/lib/actions/notify";
import { notifyClientGrouped } from "@/lib/actions/notifyClient";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireStaff, requireOwnerAdmin } from "@/lib/auth/guards";
import { asUuid, getSiteBaseUrl, money, pdfFilename } from "@/lib/utils";
import { tryEncrypt, decryptSecret } from "@/lib/crypto";
import { recordAudit } from "@/lib/actions/audit";
import { diffFields, changeLines, EMPLOYEE_FIELDS } from "@/lib/diff";

const ADMIN = process.env.ADMIN_PATH || "nx-control";

// ---------------- TESTIMONIALS ----------------
export async function saveTestimonial(id: string | null, data: Record<string, unknown>) {
  await requireOwnerAdmin();
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
  await requireOwnerAdmin();
  const db = createAdminClient();
  const res = await db.from("testimonials").update({ is_published }).eq("id", id).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/testimonials`);
  revalidatePath("/");
  revalidatePath("/about");
  return res.data;
}

export async function deleteTestimonial(id: string) {
  await requireOwnerAdmin();
  const db = createAdminClient();
  await db.from("testimonials").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/testimonials`);
  revalidatePath("/");
  revalidatePath("/about");
}

export async function seedDefaultTestimonials() {
  await requireOwnerAdmin();
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
  await requireOwnerAdmin();
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
  await requireOwnerAdmin();
  const db = createAdminClient();
  const res = await db.from("case_studies").update({ is_published }).eq("id", id).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/work`);
  revalidatePath("/work");
  revalidatePath("/");
  return res.data;
}

export async function deleteCaseStudy(id: string) {
  await requireOwnerAdmin();
  const db = createAdminClient();
  await db.from("case_studies").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/work`);
  revalidatePath("/work");
  revalidatePath("/");
}

export async function seedDefaultCaseStudies() {
  await requireOwnerAdmin();
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
  await requireOwnerAdmin();
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
  await requireOwnerAdmin();
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
  await requireOwnerAdmin();
  const db = createAdminClient();
  await db.from("services").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/services`);
  revalidatePath("/services");
  revalidatePath("/pricing");
  revalidatePath("/");
}

export async function seedDefaultServices() {
  await requireOwnerAdmin();
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
          "2 weeks dedicated warranty support",
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
  await requireOwnerAdmin();
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
  await requireOwnerAdmin();
  const db = createAdminClient();
  await db.from("posts").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/blog`);
  revalidatePath("/blog");
}

// ---------------- FAQS ----------------
export async function saveFaq(id: string | null, data: Record<string, unknown>) {
  await requireOwnerAdmin();
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
  await requireOwnerAdmin();
  const db = createAdminClient();
  const res = await db.from("faqs").update({ is_active }).eq("id", id).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/faqs`);
  revalidatePath("/");
  revalidatePath("/faq");
  return res.data;
}

export async function deleteFaq(id: string) {
  await requireOwnerAdmin();
  const db = createAdminClient();
  await db.from("faqs").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/faqs`);
  revalidatePath("/");
  revalidatePath("/faq");
}

export async function seedDefaultFaqs() {
  await requireOwnerAdmin();
  const db = createAdminClient();
  const DEFAULT_FAQS = [
    { question: "How do we start?", category: "General", sort_order: 1, is_active: true, answer: "Send us a message with what you need. We reply within one working day, get on a short call, then send a written proposal with scope, price and timeline. Once you approve it, we lock the deal and send a signed agreement PDF by email." },
    { question: "What do you need from me to begin?", category: "General", sort_order: 2, is_active: true, answer: "Your logo and brand files if you have them, your content or a rough draft of it, access to your domain and hosting, and one dedicated point of contact on your side who can approve deliverables." },
    { question: "How fast can you complete my project?", category: "Delivery", sort_order: 3, is_active: true, answer: "Most website and branding projects ship within 2 to 4 weeks. Custom web applications and mobile apps take 6 to 12 weeks depending on scope. We lock exact timeline milestones in writing before starting." },
    { question: "How does payment work?", category: "Pricing", sort_order: 4, is_active: true, answer: "Typically 50% advance to start and 50% on delivery. Larger projects can be split across key milestones. Every payment receives an automated invoice and receipt PDF with clear references." },
    { question: "What if I need something outside the agreed scope?", category: "Scope", sort_order: 5, is_active: true, answer: "We issue a clear change order detailing the additional cost and timeline impact. Nothing is added silently and nothing is billed without your explicit written approval." },
    { question: "Do I own the code and design files?", category: "Ownership", sort_order: 6, is_active: true, answer: "Yes. Full ownership of all source code, Figma design files, graphics, and account credentials transfers entirely to you once the final payment clears." },
    { question: "What technologies do you use?", category: "Technical", sort_order: 7, is_active: true, answer: "We build modern, high-performance applications using Next.js, React, React Native, TypeScript, Tailwind CSS, Node.js, and Supabase — guaranteeing 90+ Lighthouse speed scores and clean maintainable code." },
    { question: "What happens after launch?", category: "Support", sort_order: 8, is_active: true, answer: "You get 2 weeks of free post-launch support for bug fixes. After that, an optional monthly retainer covers regular updates, backups, security monitoring, and allocated development hours." },
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
import { sendEmail, adminNotifyAddress, notifyEmailChange } from "@/lib/email/send";
import { buildStaffOfferPdf } from "@/lib/pdf/staffDocs";
import { recomputeProjectProgress } from "@/lib/actions";
import { fmtDateTime, fmtDate } from "@/lib/datetime";

/** Where staff sign in. Employees use the same control panel as admins, with a reduced menu. */
export async function staffLoginUrl() {
  return `${getSiteBaseUrl()}/${ADMIN}/login`;
}

/**
 * Gives an employee a real login.
 *
 * Creates a Supabase auth user with the `staff` role, links it to the employee
 * row via `user_id`, and stores the generated password so an admin can re-read
 * it later. Mirrors `ensureClientPortalAccount` for clients.
 */
export async function ensureEmployeeAccount(employeeId: string, customPassword?: string) {
  await requireOwnerAdmin();
  const db = createAdminClient();

  const { data: employee } = await db.from("employees").select("*").eq("id", employeeId).single();
  if (!employee) throw new Error("Employee not found");
  if (!employee.email) throw new Error("This employee has no email address.");

  const password =
    customPassword ||
    decryptSecret(employee.portal_password_preview) ||
    "Nex#" + Math.floor(100000 + Math.random() * 900000);

  let userId: string | null = employee.user_id ?? null;

  if (!userId) {
    const { data: created, error } = await db.auth.admin.createUser({
      email: employee.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: employee.full_name, role: "staff" },
    });

    if (created?.user) {
      userId = created.user.id;
    } else {
      // Most often "email already registered" — adopt the existing auth user
      // rather than leaving the employee without a login.
      const { data: list } = await db.auth.admin.listUsers();
      const existing = list?.users?.find(
        (u) => u.email?.toLowerCase() === employee.email.toLowerCase()
      );
      if (!existing) {
        throw new Error(error?.message || "Could not create a login for this employee.");
      }
      userId = existing.id;
      await db.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { full_name: employee.full_name, role: "staff" },
      });
    }
  } else {
    await db.auth.admin.updateUserById(userId, { password });
  }

  await db.from("profiles").upsert({
    id: userId,
    email: employee.email,
    full_name: employee.full_name,
    role: "staff",
    is_active: true,
  });

  await db.from("employees")
    // Encrypted and short-lived, same as the client side. Storing nothing is
    // the correct outcome when no key is configured.
    .update({
      user_id: userId,
      portal_password_preview: tryEncrypt(password),
      password_preview_expires_at: new Date(Date.now() + 72 * 3600e3).toISOString(),
    })
    .eq("id", employeeId);

  return { userId, password, email: employee.email as string };
}

/**
 * The employment terms an employee row carries, formatted for email copy.
 * Shared by the joining email and the internal new-hire notice so the two can
 * never quote different figures for the same person.
 */
function employmentVars(employee: any) {
  const salaryAmount = Number(employee?.salary_amount ?? 0);
  const salaryCurrency = String(employee?.salary_currency || "USD");
  return {
    employee_name: String(employee?.full_name ?? "Team Member"),
    employee_email: String(employee?.email ?? "—"),
    job_title: String(employee?.job_title ?? "Specialist"),
    seniority: String(employee?.seniority ?? "Senior"),
    employment_type: String(employee?.employment_type ?? "Full-Time"),
    // `salary_amount` and `salary_currency` have been stored since day one and
    // used by nothing — an offer with no money in it is not an offer.
    salary: salaryAmount > 0 ? money(salaryAmount, salaryCurrency) : "As agreed separately",
    city: String(employee?.city ?? "Remote"),
    country: String(employee?.country ?? "Global"),
    joining_date: String(employee?.joining_date ?? new Date().toISOString().slice(0, 10)),
  };
}

/**
 * Sends an employee their staff-panel credentials AND their offer letter.
 *
 * The letter is rendered fresh from the employee row each time, so re-sending
 * after a salary or title change reissues the correct terms. Returns whether it
 * actually sent — the caller must not claim success on its behalf.
 */
export async function sendEmployeeCredentials(
  employeeId: string,
  language: "en" | "ar" | "fr" | "de" | "es" = "en"
) {
  const staff = await requireOwnerAdmin();
  const db = createAdminClient();

  const account = await ensureEmployeeAccount(employeeId);
  const { data: employee } = await db.from("employees").select("*").eq("id", employeeId).single();
  const loginUrl = await staffLoginUrl();

  // A failed PDF render must not cost the employee their login email, so the
  // attachment is best-effort and its absence is logged rather than thrown.
  let offer: { buffer: Buffer; filename: string } | null = null;
  try {
    const built = await buildStaffOfferPdf(employeeId);
    offer = { buffer: built.buffer, filename: built.filename };
  } catch (e) {
    console.error("Could not build the offer letter for", employeeId, e);
  }

  const result = await sendEmail({
    templateKey: "employee_joining",
    language,
    to: account.email,
    actorId: staff.userId,
    rawAttachments: offer ? [{ filename: offer.filename, content: offer.buffer }] : undefined,
    vars: {
      ...employmentVars(employee),
      staff_email: account.email,
      staff_password: account.password,
      staff_login_url: loginUrl,
    },
  });

  revalidatePath(`/${ADMIN}/employees`);
  revalidatePath(`/${ADMIN}/employees/${employeeId}`);
  return {
    ok: result.ok,
    error: result.ok ? undefined : result.error,
    password: account.password,
    offerAttached: !!offer,
  };
}

export async function saveEmployee(
  id: string | null,
  data: Record<string, unknown>,
  language: "en" | "ar" | "fr" | "de" | "es" = "en"
) {
  const staff = await requireOwnerAdmin();
  const db = createAdminClient();

  // Capture the address before the update so an email change can be detected
  // and pushed through to auth.users — otherwise the employee is locked out
  // while the admin panel shows the new address as their login.
  // The whole row, not just the address. Employee edits carried NO audit entry
  // of any kind before this, so a salary or job-title change left no trace.
  let previous: Record<string, any> | null = null;
  if (id) {
    const { data: before } = await db.from("employees").select("*").eq("id", id).maybeSingle();
    previous = before ?? null;
  }

  const res = id
    ? await db.from("employees").update(data).eq("id", id).select().single()
    : await db.from("employees").insert(data).select().single();
  if (res.error) throw res.error;

  const changes = id ? diffFields(previous, data, EMPLOYEE_FIELDS) : [];
  await recordAudit(
    staff.userId,
    id ? "employee.update" : "employee.create",
    "employees",
    res.data?.id,
    { changes: changes.map((c) => ({ field: c.key, from: c.from, to: c.to })) }
  );

  let emailed: boolean | undefined;
  let emailError: string | undefined;

  if (!id && res.data?.email) {
    // New hire: provision the login and send credentials + offer letter.
    // Awaited, because a detached promise gets killed when the serverless
    // function returns.
    try {
      const sent = await sendEmployeeCredentials(res.data.id, language);
      emailed = sent.ok;
      emailError = sent.error;
    } catch (e) {
      emailed = false;
      emailError = e instanceof Error ? e.message : "Could not send the welcome email.";
      console.error("Employee onboarding failed:", e);
    }

    // Tell the agency someone was hired. Creating a *client* has always sent an
    // internal notice; creating an employee sent nothing, so a hire made by one
    // admin was invisible to everyone else. Best-effort: a failed notice must
    // not fail the hire.
    try {
      await sendEmail({
        templateKey: "admin_employee_created_notice",
        to: await adminNotifyAddress(),
        actorId: staff.userId,
        vars: {
          ...employmentVars(res.data),
          email_status: emailed
            ? "Sent successfully."
            : `FAILED — ${emailError ?? "unknown error"}. Resend from their profile.`,
          employee_url: `${getSiteBaseUrl()}/${ADMIN}/employees/${res.data.id}`,
        },
      });
    } catch (e) {
      console.error("Could not send the new-hire notice:", e);
    }
  } else if (id && previous) {
    // Keep profiles.full_name in step with employees.full_name. Only the
    // email was ever synced, so a renamed employee kept their old name on
    // their profiles row — invisible in the panel, because employees wins the
    // precedence chain, but it is the name their portal account carries.
    if (res.data?.full_name && res.data.full_name !== previous.full_name && previous.user_id) {
      const { error: nameErr } = await db
        .from("profiles")
        .update({ full_name: res.data.full_name })
        .eq("id", previous.user_id);
      if (nameErr) console.error("saveEmployee: profiles name sync failed:", nameErr);
    }

    const newEmail = String(res.data?.email ?? "");
    const changed = !!newEmail && newEmail.toLowerCase() !== (previous.email ?? "").toLowerCase();

    if (changed && previous.user_id) {
      const { error: authErr } = await db.auth.admin.updateUserById(previous.user_id, {
        email: newEmail,
        email_confirm: true,
      });
      if (authErr) {
        // Roll the row back so the panel never shows an address that cannot log in.
        await db.from("employees").update({ email: previous.email }).eq("id", id);
        throw new Error(`Could not update the login email: ${authErr.message}`);
      }

      await db.from("profiles").update({ email: newEmail }).eq("id", previous.user_id);
      const notice = await notifyEmailChange({
        name: String(res.data?.full_name ?? "there"),
        oldEmail: previous.email,
        newEmail,
        loginUrl: await staffLoginUrl(),
        actorId: staff.userId,
      });
      emailed = notice.ok;
      emailError = notice.error;
    }

    // The address change has its own notice above, so it is left out here
    // rather than mentioned twice in two different emails.
    const notifiable = changes.filter((c) => c.notify && c.key !== "email");
    if (notifiable.length && res.data?.email) {
      const sent = await sendEmail({
        templateKey: "profile_updated",
        to: String(res.data.email),
        actorId: staff.userId,
        vars: {
          name: String(res.data?.full_name ?? "there"),
          changes: changeLines(notifiable),
        },
      });
      if (!sent.ok) console.error("saveEmployee: profile_updated email failed:", sent.error);
    }
  }

  revalidatePath(`/${ADMIN}/employees`);
  if (id) revalidatePath(`/${ADMIN}/employees/${id}`);
  return { ...res.data, emailed, emailError };
}

export async function deleteEmployee(id: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  // Soft delete: set status to Inactive while preserving all work logs and attendance records
  await db
    .from("employees")
    .update({
      status: "Inactive",
      employment_status: "inactive",
    })
    .eq("id", id);

  const { data: employee } = await db.from("employees").select("user_id").eq("id", id).maybeSingle();
  if (employee?.user_id) {
    try {
      await db.from("profiles").update({ is_active: false }).eq("id", employee.user_id);
    } catch (e) {
      console.error("Could not deactivate employee profile:", e);
    }
  }

  revalidatePath(`/${ADMIN}/employees`);
  revalidatePath(`/${ADMIN}/archive`);
  return { success: true };
}

export async function restoreEmployee(id: string) {
  await requireOwnerAdmin();
  const db = createAdminClient();

  await db
    .from("employees")
    .update({
      status: "Active",
      employment_status: "active",
    })
    .eq("id", id);

  const { data: employee } = await db.from("employees").select("user_id").eq("id", id).maybeSingle();
  if (employee?.user_id) {
    try {
      await db.from("profiles").update({ is_active: true }).eq("id", employee.user_id);
    } catch (e) {
      console.error("Could not reactivate employee profile:", e);
    }
  }

  revalidatePath(`/${ADMIN}/employees`);
  revalidatePath(`/${ADMIN}/archive`);
  return { success: true };
}

export async function saveJobTitle(id: string | null, data: Record<string, unknown>) {
  await requireOwnerAdmin();
  const db = createAdminClient();
  const res = id
    ? await db.from("employee_job_titles").update(data).eq("id", id).select().single()
    : await db.from("employee_job_titles").insert(data).select().single();
  if (res.error) throw res.error;
  revalidatePath(`/${ADMIN}/employees`);
  return res.data;
}

export async function deleteJobTitle(id: string) {
  await requireOwnerAdmin();
  const db = createAdminClient();
  await db.from("employee_job_titles").delete().eq("id", id);
  revalidatePath(`/${ADMIN}/employees`);
}

export async function assignEmployeeToClient(clientId: string, employeeId: string, projectId?: string) {
  try {
    const me = await requireOwnerAdmin();
    const db = createAdminClient();

    if (!clientId || !employeeId) {
      return { success: false, error: "Invalid client or employee ID." };
    }

    // Verify client exists in database. The email addresses are selected here
    // because both sides get told about the assignment — previously this
    // fetched only ids and names, and nobody was notified at all.
    const { data: clientObj } = await db.from("clients")
      .select("id, name, email, company").eq("id", clientId).maybeSingle();
    if (!clientObj) {
      return { success: false, error: "Selected client does not exist in the database." };
    }

    // Verify employee exists in database
    const { data: empObj } = await db.from("employees")
      .select("id, full_name, email, job_title, seniority, skills").eq("id", employeeId).maybeSingle();
    if (!empObj) {
      return { success: false, error: "Selected employee does not exist in the database." };
    }

    // Insert the assignment. The partial unique indexes on
    // (client_id, employee_id) make this idempotent at the database level, so
    // two concurrent clicks collapse into a single row instead of both passing
    // an application-level "does it exist yet?" check.
    const { error } = await db.from("client_employee_assignments").insert({
      client_id: clientId,
      employee_id: employeeId,
      project_id: projectId ?? null,
    });

    if (error) {
      // 23505 = unique violation: the pairing already exists, which is the
      // outcome the caller wanted anyway.
      if (error.code === "23505") {
        return { success: true, message: `${empObj.full_name} is already assigned to ${clientObj.name}.` };
      }
      console.error("assignEmployeeToClient insert error:", error);
      if (error.code === "23503") {
        return {
          success: false,
          error: "Assignment table is out of date. Run supabase/idempotent_fixes_2026_07.sql in the Supabase SQL editor, then try again.",
        };
      }
      return { success: false, error: error.message };
    }

    // Tell both sides. Awaited (a detached promise dies with the serverless
    // function) and reported back, so the toast states what actually happened
    // rather than assuming.
    const staffEmailed = empObj.email
      ? (await sendEmail({
          templateKey: "employee_assigned_to_client",
          to: empObj.email,
          clientId,
          actorId: me.userId,
          vars: {
            employee_name: empObj.full_name,
            client_name: clientObj.name,
            client_company: clientObj.company || clientObj.name,
            job_title: empObj.job_title ?? "Specialist",
            client_url: `${getSiteBaseUrl()}/${ADMIN}/clients/${clientId}`,
            sender_name: me.fullName ?? "Nex Desk",
          },
        })).ok
      : false;

    const clientEmailed = clientObj.email
      ? (await sendEmail({
          templateKey: "client_team_assigned",
          to: clientObj.email,
          clientId,
          actorId: me.userId,
          vars: {
            client_name: clientObj.name,
            employee_name: empObj.full_name,
            job_title: empObj.job_title ?? "Specialist",
            seniority: empObj.seniority ?? "Senior",
            skills: (empObj.skills as string[] | null)?.join(", ") || "Client delivery",
            portal_url: `${getSiteBaseUrl()}/portal`,
            sender_name: me.fullName ?? "Nex Desk",
          },
        })).ok
      : false;

    try {
      if (clientId) revalidatePath(`/${ADMIN}/clients/${clientId}`);
      if (employeeId) revalidatePath(`/${ADMIN}/employees/${employeeId}`);
      revalidatePath("/portal");
    } catch (rErr) {
      console.error("revalidatePath notice:", rErr);
    }

    return {
      success: true,
      emailed: { staff: staffEmailed, client: clientEmailed },
      message:
        staffEmailed && clientEmailed
          ? `${empObj.full_name} assigned. Both they and ${clientObj.name} have been emailed.`
          : staffEmailed
            ? `${empObj.full_name} assigned and emailed. The client was not notified.`
            : clientEmailed
              ? `${empObj.full_name} assigned. ${clientObj.name} was emailed, but ${empObj.full_name} was not.`
              : `${empObj.full_name} assigned, but no notification emails went out.`,
    };
  } catch (err: any) {
    console.error("assignEmployeeToClient top error:", err);
    return { success: false, error: err.message || "Failed to assign employee to client." };
  }
}

export async function removeEmployeeFromClient(assignmentId: string, clientId?: string, employeeId?: string) {
  try {
    await requireOwnerAdmin();
    const db = createAdminClient();
    const { error } = await db.from("client_employee_assignments").delete().eq("id", assignmentId);
    if (error) return { success: false, error: error.message };

    try {
      if (clientId) revalidatePath(`/${ADMIN}/clients/${clientId}`);
      if (employeeId) revalidatePath(`/${ADMIN}/employees/${employeeId}`);
      revalidatePath("/portal");
    } catch (rErr) {
      console.error("revalidatePath notice:", rErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error("removeEmployeeFromClient error:", err);
    return { success: false, error: err.message || "Failed to remove assignment." };
  }
}

export async function updateAssignedEmployee(assignmentId: string, newEmployeeId: string, clientId?: string) {
  try {
    await requireOwnerAdmin();
    const db = createAdminClient();
    const { error } = await db.from("client_employee_assignments").update({ employee_id: newEmployeeId }).eq("id", assignmentId);
    if (error) return { success: false, error: error.message };

    try {
      if (clientId) revalidatePath(`/${ADMIN}/clients/${clientId}`);
      revalidatePath("/portal");
    } catch (rErr) {
      console.error("revalidatePath notice:", rErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error("updateAssignedEmployee error:", err);
    return { success: false, error: err.message || "Failed to update assigned staff." };
  }
}

// ---------------- CLIENT SIGNED DOCUMENT UPLOADS ----------------
export async function uploadClientSignedDocument(data: {
  clientId: string;
  title: string;
  storagePath: string;
  documentType?: string;
}) {
  const clientId = asUuid(data.clientId);
  if (!clientId) throw new Error("Invalid client reference.");

  const db = createAdminClient();
  const { data: clientObj } = await db
    .from("clients").select("id, name, email, profile_id").eq("id", clientId).maybeSingle();
  if (!clientObj) throw new Error("Client not found.");

  // `clientId` arrives from the browser, so ownership has to be proven here —
  // this action runs with the service-role key and would otherwise let anyone
  // file a document against any client.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ownsRecord =
    !!user &&
    (clientObj.profile_id === user.id ||
      clientObj.email?.toLowerCase() === user.email?.toLowerCase());

  // Either the client owns this record, or a staff member is filing it for them.
  if (!ownsRecord) await requireStaff();

  const { data: res, error } = await db.from("documents").insert({
    // `type` is a NOT NULL doc_type enum — omitting it was what made every
    // upload fail. The free-text `document_type` carries the finer label.
    type: "agreement",
    client_id: clientId,
    title: data.title,
    storage_path: data.storagePath,
    uploaded_by_client: true,
    document_type: data.documentType || "signed_agreement",
  }).select().single();

  if (error) throw new Error(error.message || "Failed to upload document.");

  await notify({
    kind: "document.uploaded",
    title: `${clientObj?.name ?? "A client"} uploaded “${data.title}”`,
    body: "Signed paperwork is waiting in their documents.",
    href: `/${ADMIN}/clients/${clientId}`,
    entity: "documents",
    entityId: res.id,
    actorLabel: clientObj?.name ?? null,
    actorKind: ownsRecord ? "client" : "staff",
    clientId,
  });

  // Pull the file back out of storage so the notice carries the actual
  // document. The admin previously got a link to go and find it, which defeats
  // the point of being told at all.
  let attachment: { filename: string; content: Buffer } | null = null;
  try {
    const { data: blob } = await db.storage.from("documents").download(data.storagePath);
    if (blob) {
      attachment = {
        filename: pdfFilename(data.title),
        content: Buffer.from(await blob.arrayBuffer()),
      };
    }
  } catch (e) {
    console.error("Could not attach the signed document to the notice:", e);
  }

  const adminEmail = await adminNotifyAddress();
  await sendEmail({
    templateKey: "admin_document_uploaded_notice",
    to: adminEmail,
    clientId,
    rawAttachments: attachment ? [attachment] : undefined,
    vars: { client_name: clientObj.name || "Client", doc_title: data.title },
    bodyOverride:
      `${clientObj.name || "A client"} (${clientObj.email || ""}) has uploaded a signed document.\n\n` +
      `• Title: ${data.title}\n` +
      `• Type: ${data.documentType || "Signed agreement"}\n` +
      `• Uploaded: ${fmtDateTime()}\n\n` +
      (attachment
        ? `The document is attached to this email.`
        : `The file could not be attached — open it here: ${getSiteBaseUrl()}/${ADMIN}/documents`),
    subjectOverride: `📥 Signed document from ${clientObj.name || "a client"}: ${data.title}`,
  }).catch((emailErr) => console.error("Error sending document upload notice email:", emailErr));

  // Confirm receipt to the client. They uploaded something important and heard
  // nothing back at all.
  if (clientObj.email) {
    await sendEmail({
      templateKey: "client_document_received",
      to: clientObj.email,
      clientId,
      vars: {
        client_name: clientObj.name || "there",
        doc_title: data.title,
        portal_url: `${getSiteBaseUrl()}/portal`,
      },
    }).catch((e) => console.error("Could not confirm the upload to the client:", e));
  }

  revalidatePath("/portal");
  revalidatePath(`/${ADMIN}/documents`);
  revalidatePath(`/${ADMIN}/clients/${clientId}`);
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
  /** Show this entry on the client's project timeline in the portal. */
  client_visible?: boolean;
  /** Percentage points to add to the project when it has no milestones. */
  progress_delta?: number;
  /** Answers to the per-service fields, keyed by field id. */
  metrics?: Record<string, string | boolean | number>;
  /**
   * Where `hours_spent` came from — the timer, or a person's judgement.
   *
   * `adjusted` means a tracked figure was overridden, and `hours_tracked`
   * keeps the original. Recording this is what makes somebody who adjusts
   * every single day visible, without anyone being accused of anything.
   */
  hours_source?: "manual" | "tracked" | "adjusted";
  hours_tracked?: number | null;
}) {
  // Staff-accessible: logging your own work is the whole point of this screen.
  await requireStaff();
  const db = createAdminClient();

  // These columns are uuid. Anything that isn't a uuid must become NULL rather
  // than reaching Postgres, which would raise 22P02 and 500 the whole action.
  const employeeId = asUuid(data.employee_id);
  const projectId = asUuid(data.project_id);

  if (!employeeId) {
    throw new Error("Select a valid employee before submitting a work log.");
  }

  const clientVisible = !!data.client_visible && !!projectId;
  const progressDelta = Math.max(0, Math.min(100, Number(data.progress_delta) || 0));

  const { data: res, error } = await db.from("daily_work_logs").insert({
    employee_id: employeeId,
    employee_name: data.employee_name || null,
    project_id: projectId,
    project_title: data.project_title || null,
    work_date: data.work_date,
    hours_spent: data.hours_spent,
    hours_source: data.hours_source ?? "manual",
    hours_tracked: data.hours_tracked ?? null,
    tasks_completed: data.tasks_completed,
    blockers: data.blockers || null,
    proof_url: data.proof_url || null,
    client_visible: clientVisible,
    progress_delta: progressDelta,
    // Blank answers are dropped rather than stored as empty strings, so a
    // report can treat "absent" and "zero" as different things.
    metrics: Object.fromEntries(
      Object.entries(data.metrics ?? {}).filter(
        ([, v]) => v !== "" && v !== null && v !== undefined && v !== false
      )
    ),
  }).select().single();

  if (error) throw new Error(error.message || "Failed to submit daily work log.");

  // Recompute whenever real work was reported, not only when it is shared —
  // internal progress still has to move the admin and staff views.
  let progress: number | null = null;
  if (projectId) {
    progress = await recomputeProjectProgress(projectId, progressDelta);
    revalidatePath("/portal");
    revalidatePath(`/${ADMIN}/projects/${projectId}`);
    // The dashboards read project progress too, and both were stale before.
    revalidatePath(`/${ADMIN}`, "layout");
  }

  const adminEmail = await adminNotifyAddress();
  const emailed = { client: false, admin: false };

  // The client only hears about entries the team chose to share.
  if (clientVisible && projectId) {
    const { data: project } = await db
      .from("projects")
      .select("name, client_id, clients(name, email)")
      .eq("id", projectId)
      .maybeSingle();

    const projectClient = (project?.clients as any) ?? null;
    if (projectClient?.email) {
      const res = await sendEmail({
        templateKey: "client_work_update",
        to: projectClient.email,
        clientId: project?.client_id ?? undefined,
        projectId,
        vars: {
          client_name: projectClient.name || "there",
          project_name: project?.name || data.project_title || "your project",
          work_date: data.work_date,
          progress: progress ?? 0,
          tasks_completed: data.tasks_completed,
          portal_url: `${getSiteBaseUrl()}/portal`,
        },
      });
      emailed.client = res.ok;

      // Trigger in-app notification in client portal
      if (project?.client_id) {
        await notifyClientGrouped({
          clientId: project.client_id,
          kind: "project.progress",
          title: (count) =>
            count === 1
              ? `New work update on ${project.name || "your project"}`
              : `${count} new work updates on ${project.name || "your project"}`,
          body: String(data.tasks_completed).split("\n")[0].slice(0, 140),
          href: `/portal/projects/${projectId}?tab=timeline`,
          entityId: projectId,
        }).catch(() => null);
      }
    }
  }

  await notify({
    kind: "worklog.submitted",
    title: `${data.employee_name} logged ${data.hours_spent}h on ${data.project_title || "agency work"}`,
    body: data.blockers?.trim()
      ? `Blocked: ${data.blockers.trim()}`
      : String(data.tasks_completed).split("\n")[0].slice(0, 140),
    href: `/${ADMIN}/daily-logs`,
    entity: "daily_work_logs",
    entityId: res?.id ?? null,
    actorLabel: data.employee_name,
    actorKind: "staff",
    clientId: null,
    meta: { blocked: !!data.blockers?.trim() },
  });

  // Awaited, not fire-and-forget: a detached promise is killed when the
  // serverless function returns, which is why some of these never arrived.
  const adminRes = await sendEmail({
    templateKey: "admin_work_log_notice",
    to: adminEmail,
    projectId: projectId ?? undefined,
    vars: {
      employee_name: data.employee_name || "Staff Member",
      project_title: data.project_title || "General Task",
    },
    bodyOverride:
      `A new daily work log has been submitted.\n\n` +
      `• Staff member: ${data.employee_name || "N/A"}\n` +
      `• Project: ${data.project_title || "N/A"}\n` +
      `• Work date: ${fmtDate(data.work_date)}\n` +
      `• Hours: ${data.hours_spent}\n` +
      (progress !== null ? `• Project progress now: ${progress}%\n` : "") +
      `• Shared with client: ${clientVisible ? "yes" : "no"}\n\n` +
      `What they did:\n\n${data.tasks_completed}` +
      (data.blockers ? `\n\n## Blocker raised\n\n${data.blockers}` : "") +
      `\n\nReview every log here:\n${getSiteBaseUrl()}/${ADMIN}/daily-logs`,
    subjectOverride: data.blockers
      ? `⚠️ Blocker raised by ${data.employee_name || "staff"} — ${data.project_title || "project"}`
      : `📝 Work log — ${data.employee_name || "staff"} (${fmtDate(data.work_date)})`,
  }).catch((emailErr) => {
    console.error("Error sending work log notice email:", emailErr);
    return { ok: false as const };
  });
  emailed.admin = adminRes.ok;

  revalidatePath(`/${ADMIN}/daily-logs`);
  revalidatePath(`/${ADMIN}/employees`);
  revalidatePath(`/${ADMIN}/projects`);
  return { ...res, progress, emailed };
}

export async function deleteDailyWorkLog(id: string) {
  await requireStaff();
  const db = createAdminClient();

  // Take the entry's contribution back out of the project, otherwise deleting a
  // log that claimed +20% leaves the client looking at progress that was never
  // made.
  const { data: log } = await db
    .from("daily_work_logs").select("project_id, progress_delta").eq("id", id).maybeSingle();

  const { error } = await db.from("daily_work_logs").delete().eq("id", id);
  if (error) throw error;

  if (log?.project_id) {
    await recomputeProjectProgress(log.project_id, -Number(log.progress_delta || 0));
    revalidatePath("/portal");
    revalidatePath(`/${ADMIN}/projects/${log.project_id}`);
    revalidatePath(`/${ADMIN}`, "layout");
  }

  revalidatePath(`/${ADMIN}/daily-logs`);
}

export async function uploadPublicAsset(formData: FormData): Promise<{ url?: string; error?: string }> {
  // Staff upload proof screenshots against their work logs.
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
      // This used to fall back to a base64 data URL of the whole file, which
      // then got saved into the column the caller was filling — an 8MB photo
      // became an ~11MB string in Postgres, re-downloaded on every page that
      // rendered it. Worse, it failed silently: the upload looked like it had
      // worked, and the first symptom was a slow app rather than an error.
      //
      // Failing loudly is the whole point. Every caller already shows `error`.
      return {
        error:
          "The image could not be saved to storage. Nothing has been changed — try again, and if it keeps happening check the public-assets bucket.",
      };
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

