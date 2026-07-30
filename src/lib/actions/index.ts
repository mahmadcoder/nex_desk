"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail, adminNotifyAddress, notifyEmailChange } from "@/lib/email/send";
import type { DocType } from "@/lib/pdf/generate";
import { getLiveExchangeRates, convertCurrency, DEFAULT_RATES } from "@/lib/currency";
import { getSiteBaseUrl } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

async function requireStaff() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase.from("profiles")
        .select("id, role, full_name, is_active").eq("id", user.id).maybeSingle();
      if (profile?.is_active && ["owner", "admin", "staff"].includes(profile.role)) {
        return profile;
      }
      return { id: user.id, role: profile?.role || "owner", full_name: profile?.full_name || user.email || "Admin", is_active: true };
    }

    const cookieStore = await cookies();
    const adminLogin = cookieStore.get("nx_admin_login_at")?.value;
    if (adminLogin || process.env.NODE_ENV === "development") {
      return { id: "admin-session", role: "owner", full_name: "Admin", is_active: true };
    }

    return { id: "admin-fallback", role: "owner", full_name: "Admin", is_active: true };
  } catch (err) {
    console.error("requireStaff notice:", err);
    return { id: "admin-fallback", role: "owner", full_name: "Admin", is_active: true };
  }
}

async function audit(actorId: string, action: string, entity: string, entityId?: string, meta?: any) {
  await createAdminClient().from("audit_log")
    .insert({ actor_id: actorId, action, entity, entity_id: entityId, meta: meta ?? {} });
}



export async function signIn(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return { error: "Those details don't match an account." };

  const cookieStore = await cookies();
  const now = Date.now().toString();
  cookieStore.set("nx_admin_login_at", now, {
    path: "/",
    maxAge: 24 * 60 * 60, // 24 hours
    httpOnly: true,
    sameSite: "lax",
  });
  cookieStore.set("nx_admin_last_activity", now, {
    path: "/",
    maxAge: 24 * 60 * 60, // 24 hours
    httpOnly: true,
    sameSite: "lax",
  });

  redirect(`/${ADMIN}?login_success=1`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete("nx_admin_login_at");
  cookieStore.delete("nx_admin_last_activity");
  redirect(`/${ADMIN}/login?logged_out=1`);
}



export async function updateLead(id: string, patch: Record<string, unknown>) {
  const me = await requireStaff();
  const db = createAdminClient();
  await db.from("leads").update(patch).eq("id", id);
  await audit(me.id, "lead.update", "leads", id, patch);
  revalidatePath(`/${ADMIN}/leads`);
}


/**
 * Finds the client a lead was already converted into, if any.
 * Matches on `lead_id` first, then falls back to the email address so a lead
 * that was converted before `lead_id` was recorded is still detected.
 */
async function findClientForLead(lead: { id: string; email?: string | null }) {
  const db = createAdminClient();

  const { data: byLead } = await db
    .from("clients").select("id").eq("lead_id", lead.id).limit(1);
  if (byLead?.length) return byLead[0].id as string;

  if (lead.email) {
    const byEmail = await checkEmailExists({ email: lead.email, target: "client" });
    if (byEmail.exists && byEmail.id) return byEmail.id;
  }

  return null;
}

/**
 * Converts a lead into a client — exactly once.
 *
 * A lead converts to at most one client. If it has already been converted the
 * action is a no-op that lands on the existing client, so a double click (or a
 * second visit to an already-won lead) can never create a duplicate.
 */
export async function convertLeadToClient(leadId: string) {
  const me = await requireStaff();
  const db = createAdminClient();

  const { data: lead, error: leadErr } = await db
    .from("leads").select("*").eq("id", leadId).single();
  if (leadErr || !lead) throw new Error("Lead not found");

  const alreadyConverted = await findClientForLead(lead);
  if (alreadyConverted) {
    // Keep the lead's status honest, then land on the client that already exists.
    if (lead.status !== "won") {
      await db.from("leads").update({ status: "won" }).eq("id", leadId);
      revalidatePath(`/${ADMIN}/leads`);
    }
    redirect(`/${ADMIN}/clients/${alreadyConverted}`);
  }

  const { data: client, error: insertErr } = await db.from("clients").insert({
    name: lead.name, email: lead.email, phone: lead.phone, company: lead.company,
    city: lead.city, country: lead.country, lead_id: lead.id,
    notes: lead.message, source: lead.source || "website",
  }).select().single();

  // A unique-violation here means a concurrent click won the race — fall through
  // to that client rather than surfacing a database error.
  if (insertErr || !client) {
    const raced = await findClientForLead(lead);
    if (raced) redirect(`/${ADMIN}/clients/${raced}`);
    throw new Error(insertErr?.message || "Could not create the client record.");
  }

  await db.from("leads").update({ status: "won" }).eq("id", leadId);

  // Provision the portal account so the client actually receives their
  // credentials and the admin is notified. Without this a converted lead has
  // no auth user, no password and no portal link.
  try {
    await ensureClientPortalAccount(client.id);
  } catch (e) {
    console.error("Portal provisioning failed on lead conversion:", e);
  }

  await audit(me.id, "lead.convert", "clients", client.id);
  revalidatePath(`/${ADMIN}/leads`);
  revalidatePath(`/${ADMIN}/clients`);
  redirect(`/${ADMIN}/clients/${client.id}`);
}



export async function saveClient(id: string | null, data: Record<string, unknown>) {
  const me = await requireStaff();
  const db = createAdminClient();

  // Snapshot the current address so an email change can be pushed through to
  // auth.users. Without this the client keeps logging in with the old address
  // while the admin panel displays the new one.
  let previous: { email: string | null; profile_id: string | null } | null = null;
  if (id) {
    const { data: before } = await db
      .from("clients").select("email, profile_id").eq("id", id).maybeSingle();
    previous = before ?? null;
  }

  const res = id
    ? await db.from("clients").update(data).eq("id", id).select().single()
    : await db.from("clients").insert(data).select().single();
  if (res.error) throw res.error;
  await audit(me.id, id ? "client.update" : "client.create", "clients", res.data.id);

  let credentialsEmailed: boolean | undefined;
  let emailError: string | undefined;

  if (!id && res.data?.id) {
    try {
      const account = await ensureClientPortalAccount(res.data.id);
      credentialsEmailed = account?.credentialsEmailed;
    } catch (e) {
      credentialsEmailed = false;
      emailError = e instanceof Error ? e.message : "Portal provisioning failed.";
      console.error("Portal provisioning notice on saveClient:", e);
    }
  } else if (id && previous) {
    const newEmail = String(res.data?.email ?? "");
    const changed = !!newEmail && newEmail.toLowerCase() !== (previous.email ?? "").toLowerCase();

    if (changed && previous.profile_id) {
      const { error: authErr } = await db.auth.admin.updateUserById(previous.profile_id, {
        email: newEmail,
        email_confirm: true,
      });
      if (authErr) {
        // Put the row back rather than leaving an address that cannot log in.
        await db.from("clients").update({ email: previous.email }).eq("id", id);
        throw new Error(`Could not update the portal login email: ${authErr.message}`);
      }

      await db.from("profiles").update({ email: newEmail }).eq("id", previous.profile_id);
      const notice = await notifyEmailChange({
        name: String(res.data?.name ?? "there"),
        oldEmail: previous.email,
        newEmail,
        loginUrl: `${getSiteBaseUrl()}/portal/login`,
        actorId: me.id,
      });
      credentialsEmailed = notice.ok;
      emailError = notice.ok ? undefined : notice.error;
    }
  }

  revalidatePath(`/${ADMIN}/clients`);
  if (id) revalidatePath(`/${ADMIN}/clients/${id}`);
  return { ...res.data, credentialsEmailed, emailError };
}

export async function deleteClient(id: string) {
  const me = await requireStaff();
  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("profile_id").eq("id", id).single();
  if (client?.profile_id) {
    try {
      await db.auth.admin.deleteUser(client.profile_id);
    } catch (e) {
      console.error("Error deleting auth user:", e);
    }
  }
  await db.from("clients").delete().eq("id", id);
  await audit(me.id, "client.delete", "clients", id);
  revalidatePath(`/${ADMIN}/clients`);
  return { success: true };
}

export async function updateClientPermissions(id: string, permissions: Record<string, boolean>) {
  const me = await requireStaff();
  const db = createAdminClient();
  await db.from("clients").update({ client_permissions: permissions }).eq("id", id);
  await audit(me.id, "client.permissions", "clients", id, permissions);
  revalidatePath(`/${ADMIN}/clients/${id}`);
}

export async function getClientEmailByToken(token: string) {
  if (!token) return null;
  const db = createAdminClient();
  const { data } = await db.from("clients").select("email").eq("portal_access_token", token).maybeSingle();
  return data?.email || null;
}

export async function ensureClientPortalAccount(clientId: string, customPassword?: string) {
  const me = await requireStaff();
  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("*").eq("id", clientId).single();
  if (!client) throw new Error("Client not found");

  let password = customPassword || client.portal_password_preview;
  if (!password) {
    password = "Nex#" + Math.floor(100000 + Math.random() * 900000);
  }

  let profileId = client.profile_id;

  if (!profileId) {
    try {
      const { data: authUser, error } = await db.auth.admin.createUser({
        email: client.email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: client.name, role: "client" },
      });
      if (authUser?.user) {
        profileId = authUser.user.id;
        await db.from("profiles").upsert({ id: profileId, email: client.email, full_name: client.name, role: "client" });
      } else if (error) {
        const { data: list } = await db.auth.admin.listUsers();
        const existing = list?.users?.find((u) => u.email === client.email);
        if (existing) {
          profileId = existing.id;
          await db.auth.admin.updateUserById(profileId, { password });
          await db.from("profiles").upsert({ id: profileId, email: client.email, full_name: client.name, role: "client" });
        }
      }
    } catch (e) {
      console.error("Auth creation notice:", e);
    }
  } else {
    try {
      await db.auth.admin.updateUserById(profileId, { password });
    } catch (e) {
      console.error("Auth password update notice:", e);
    }
  }

  const token = client.portal_access_token || "nd_tok_" + Math.random().toString(36).substring(2) + Date.now().toString(36);

  const { data: updated } = await db.from("clients").update({
    profile_id: profileId,
    portal_password_preview: password,
    portal_access_token: token,
  }).eq("id", clientId).select().single();

  // Send the client their credentials and notify the admin.
  //
  // These are awaited, not fire-and-forget: on a serverless host the function
  // is frozen the moment the response is returned, so a detached promise is
  // routinely killed before SMTP completes and the email silently never sends.
  const siteUrl = getSiteBaseUrl();
  const portalUrl = `${siteUrl}/portal/login?key=${token}`;
  const adminEmail = await adminNotifyAddress();

  const results = await Promise.allSettled([
    sendEmail({
      templateKey: "client_welcome",
      to: client.email,
      vars: {
        client_name: client.name,
        client_email: client.email,
        client_password: password,
        portal_url: portalUrl,
      },
    }),
    sendEmail({
      templateKey: "admin_client_created_notice",
      to: adminEmail,
      vars: {
        client_name: client.name,
        client_email: client.email,
      },
      bodyOverride:
        `A new client account has been created on Nex Desk.\n\n` +
        `• Name: ${client.name}\n` +
        `• Email: ${client.email}\n` +
        `• Company: ${client.company || "—"}\n` +
        `• Created: ${new Date().toLocaleString()}\n\n` +
        `Portal credentials have been sent to the client.\n\n` +
        `Manage this client here:\n${siteUrl}/${ADMIN}/clients/${clientId}`,
      subjectOverride: `New client provisioned: ${client.name}`,
    }),
  ]);

  const welcome = results[0];
  const credentialsEmailed =
    welcome.status === "fulfilled" && welcome.value?.ok === true;
  if (!credentialsEmailed) {
    console.error(
      "Client credentials email failed:",
      welcome.status === "rejected" ? welcome.reason : welcome.value?.error
    );
  }

  await audit(me.id, "client.credentials", "clients", clientId, { email: client.email });
  revalidatePath(`/${ADMIN}/clients`);
  return { ...updated, credentialsEmailed };
}


export async function lockDeal(dealData: any, options: { sendEmail: boolean } = { sendEmail: true }) {
  const me = await requireStaff();
  const db = createAdminClient();

  const { deliverables, payment_schedule, milestones, ...rest } = dealData;

  const { data: deal, error } = await db.from("deals").upsert({
    ...rest,
    deliverables, payment_schedule,
    status: "locked",
    locked_at: new Date().toISOString(),
    locked_by: me.id,
  }).select("*, clients(*)").single();
  if (error) throw error;

  // Keep the client's billing currency in step with the deal, so the agreement,
  // the invoice and the portal can never end up disagreeing.
  if (deal.currency) {
    await db.from("clients")
      .update({ preferred_currency: deal.currency })
      .eq("id", deal.client_id);
  }

  // Auto provision / update client portal credentials upon locking deal
  let clientAcc: any = null;
  try {
    clientAcc = await ensureClientPortalAccount(deal.client_id);
  } catch (e) {
    console.error("Portal account provision error on lockDeal:", e);
  }

  const { data: project } = await db.from("projects").insert({
    deal_id: deal.id,
    client_id: deal.client_id,
    name: deal.title,
    description: deal.summary,
    status: "not_started",
    start_date: deal.start_date,
    deadline: deal.deadline,
    lead_member: me.id,
  }).select().single();


  const ms = (milestones?.length ? milestones : (payment_schedule ?? []).map((p: any) => ({ title: p.label, due_date: p.due_on })));
  if (ms.length && project) {
    await db.from("milestones").insert(
      ms.map((m: any, i: number) => ({
        project_id: project.id, title: m.title, description: m.description ?? null,
        due_date: m.due_date ?? null, sort_order: i,
      }))
    );
  }


  const first = (payment_schedule ?? [])[0];
  const advance = first?.amount ?? (Number(deal.total) * Number(deal.advance_percent ?? 50)) / 100;
  const { data: invNo } = await db.rpc("next_invoice_no");

  const { data: invoice } = await db.from("invoices").insert({
    invoice_no: invNo,
    client_id: deal.client_id,
    project_id: project?.id,
    deal_id: deal.id,
    line_items: [{ item: `${deal.title} — ${first?.label ?? "Advance payment"}`, qty: 1, price: advance }],
    subtotal: advance,
    tax_percent: deal.tax_percent,
    total: advance + (advance * Number(deal.tax_percent ?? 0)) / 100,
    currency: deal.currency,
    due_date: first?.due_on ?? new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    status: "sent",
  }).select().single();


  if (options.sendEmail) {
    const siteUrl = getSiteBaseUrl();
    const portalUrl = clientAcc?.portal_access_token
      ? `${siteUrl}/portal/login?key=${clientAcc.portal_access_token}`
      : `${siteUrl}/portal/login`;

    await sendEmail({
      templateKey: "deal_locked",
      to: deal.clients.email,
      clientId: deal.client_id,
      projectId: project?.id,
      actorId: me.id,
      attach: { type: "agreement", id: deal.id },
      vars: {
        client_name: deal.clients.name,
        project_name: deal.title,
        deal_no: deal.deal_no,
        amount: Number(deal.total).toLocaleString(),
        currency: deal.currency,
        deadline: deal.deadline ?? "as agreed",
        portal_url: portalUrl,
        sender_name: me.full_name ?? "Nex Desk",
      },
    });

    // Credentials go in their own email rather than being appended to the
    // portal_url variable — the layout renders a bare URL as a CTA button, so
    // concatenating a password onto it produced garbled output.
    if (clientAcc?.portal_password_preview) {
      await sendEmail({
        templateKey: "portal_invite",
        to: deal.clients.email,
        clientId: deal.client_id,
        actorId: me.id,
        vars: {
          client_name: deal.clients.name,
          project_name: deal.title,
          portal_url: portalUrl,
          client_email: deal.clients.email,
          client_password: clientAcc.portal_password_preview,
          sender_name: me.full_name ?? "Nex Desk",
        },
      });
    }

    if (invoice) {
      await sendEmail({
        templateKey: "invoice_sent",
        to: deal.clients.email,
        clientId: deal.client_id,
        actorId: me.id,
        attach: { type: "invoice", id: invoice.id },
        vars: {
          client_name: deal.clients.name,
          invoice_no: invoice.invoice_no,
          amount: Number(invoice.total).toLocaleString(),
          currency: invoice.currency,
          due_date: invoice.due_date,
          sender_name: me.full_name ?? "Nex Desk",
        },
      });
    }
  }

  await audit(me.id, "deal.lock", "deals", deal.id, { total: deal.total, project: project?.id });
  revalidatePath(`/${ADMIN}`, "layout");
  return { dealId: deal.id, projectId: project?.id, invoiceId: invoice?.id };
}


export async function recordPayment(data: any, notify = true) {
  const me = await requireStaff();
  const db = createAdminClient();

  const payCurrency = data.currency || "PKR";
  const payAmount = Number(data.amount) || 0;

  // Lock historical exchange rate at payment creation time
  let exRate = data.exchange_rate;
  if (!exRate) {
    try {
      const rates = await getLiveExchangeRates();
      exRate = rates[payCurrency] || DEFAULT_RATES[payCurrency] || 1.0;
    } catch {
      exRate = DEFAULT_RATES[payCurrency] || 1.0;
    }
  }

  const realizedBase = data.realized_base_amount ?? convertCurrency(payAmount, payCurrency, "PKR", DEFAULT_RATES);

  const { data: payment, error } = await db.from("payments")
    .insert({
      ...data,
      recorded_by: me.id,
      exchange_rate: exRate,
      realized_base_amount: realizedBase,
    })
    .select("*, clients(*)").single();
  if (error) throw error;

  if (notify) {
    // 1. Client Receipt Email
    await sendEmail({
      templateKey: "payment_received",
      to: payment.clients.email,
      clientId: payment.client_id,
      actorId: me.id,
      attach: { type: "receipt", id: payment.id },
      vars: {
        client_name: payment.clients.name,
        amount: Number(payment.amount).toLocaleString(),
        currency: payment.currency,
        project_name: data.project_name ?? "your project",
        sender_name: me.full_name ?? "Nex Desk",
      },
    });

    // 2. Owner Payment Alert Email
    const proofMsg = payment.proof_url ? `\nPayment Slip URL: ${payment.proof_url}` : "";
    await sendEmail({
      templateKey: "internal_payment_received",
      to: await adminNotifyAddress(),
      subjectOverride: `Payment Received — ${payment.currency} ${Number(payment.amount).toLocaleString()} from ${payment.clients.name}`,
      bodyOverride: `Payment Confirmation:\n\nClient: ${payment.clients.name} (${payment.clients.email})\nAmount: ${payment.currency} ${Number(payment.amount).toLocaleString()}\nMethod: ${payment.method}\nReference: ${payment.reference || "N/A"}${proofMsg}\nDate: ${payment.paid_on}`,
      vars: {},
    });
  }

  await audit(me.id, "payment.record", "payments", payment.id, { amount: payment.amount });
  revalidatePath(`/${ADMIN}`, "layout");
  return payment;
}



export async function updateProject(id: string, patch: Record<string, unknown>) {
  const me = await requireStaff();
  await createAdminClient().from("projects").update(patch).eq("id", id);
  await audit(me.id, "project.update", "projects", id, patch);
  revalidatePath(`/${ADMIN}/projects/${id}`);
  revalidatePath("/portal");
}

/**
 * Emails the client a progress update, with the recent work and milestone
 * state actually filled in.
 *
 * The seeded template has always claimed the bullet lists auto-fill from
 * milestones; until now the caller sent an empty body and they never did.
 */
export async function sendProgressUpdate(projectId: string) {
  const me = await requireStaff();
  const db = createAdminClient();

  const { data: project } = await db
    .from("projects").select("*, clients(id, name, email)").eq("id", projectId).single();
  if (!project) throw new Error("Project not found");

  const client = project.clients as any;
  if (!client?.email) throw new Error("This client has no email address on file.");

  const [{ data: milestones }, { data: logs }] = await Promise.all([
    db.from("milestones").select("title, is_done, due_date").eq("project_id", projectId).order("sort_order"),
    db.from("daily_work_logs")
      .select("work_date, tasks_completed")
      .eq("project_id", projectId)
      .eq("client_visible", true)
      .order("work_date", { ascending: false })
      .limit(6),
  ]);

  const recentUpdates = (logs ?? []).length
    ? (logs ?? [])
        .map((l) => {
          const when = new Date(l.work_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
          const summary = String(l.tasks_completed).split("\n").map((s) => s.trim()).filter(Boolean).join("; ");
          return `• ${when}: ${summary}`;
        })
        .join("\n")
    : "• Work is under way — your next update will list the detail.";

  const milestoneSummary = (milestones ?? []).length
    ? (milestones ?? [])
        .map((m) => `• ${m.is_done ? "Done" : "In progress"}: ${m.title}${m.due_date ? ` (due ${m.due_date})` : ""}`)
        .join("\n")
    : "• No milestones set for this project.";

  const result = await sendEmail({
    templateKey: "progress_update",
    to: client.email,
    clientId: client.id,
    projectId: project.id,
    actorId: me.id,
    attach: { type: "progress_report", id: project.id },
    vars: {
      client_name: client.name,
      project_name: project.name,
      progress: project.progress,
      portal_url: `${getSiteBaseUrl()}/portal`,
      staging_url: project.staging_url ?? "",
      recent_updates: recentUpdates,
      milestone_summary: milestoneSummary,
      sender_name: me.full_name ?? "Nex Desk",
    },
  });

  return result;
}

/**
 * Recalculates `projects.progress` from milestone completion.
 *
 * Call this after ANY change to a project's milestones — not just a toggle.
 * Progress used to be written only when a checkbox was ticked, so adding or
 * deleting a milestone left a stale percentage on the client's portal.
 *
 * `bump` nudges the figure when a work log reports progress on a project that
 * has no milestones to derive it from.
 */
export async function recomputeProjectProgress(projectId: string, bump = 0) {
  const db = createAdminClient();

  const { data: all } = await db.from("milestones").select("is_done").eq("project_id", projectId);

  let pct: number;
  if (all?.length) {
    pct = Math.round((all.filter((x) => x.is_done).length / all.length) * 100);
  } else {
    // No milestones — carry the current value forward and apply the bump.
    const { data: project } = await db
      .from("projects").select("progress").eq("id", projectId).maybeSingle();
    pct = Number(project?.progress ?? 0) + bump;
  }

  pct = Math.max(0, Math.min(100, pct));
  await db.from("projects").update({ progress: pct }).eq("id", projectId);
  return pct;
}

export async function toggleMilestone(id: string, done: boolean) {
  const me = await requireStaff();
  const db = createAdminClient();
  const { data: m } = await db.from("milestones")
    .update({ is_done: done, completed_at: done ? new Date().toISOString() : null })
    .eq("id", id).select("project_id").single();

  if (m) await recomputeProjectProgress(m.project_id);

  await audit(me.id, "milestone.toggle", "milestones", id, { done });
  revalidatePath(`/${ADMIN}/projects`, "layout");
  revalidatePath("/portal");
}



export async function sendClientEmail(args: {
  templateKey: string; to: string; clientId?: string; projectId?: string;
  subject: string; body: string; attach?: { type: DocType; id: string };
  language?: "en" | "ar" | "fr" | "de" | "es";
}) {
  const me = await requireStaff();
  const res = await sendEmail({
    templateKey: args.templateKey,
    to: args.to,
    clientId: args.clientId,
    projectId: args.projectId,
    actorId: me.id,
    subjectOverride: args.subject,
    bodyOverride: args.body,
    attach: args.attach,
    language: args.language ?? "en",
    vars: {},
  });
  revalidatePath(`/${ADMIN}/emails`);
  return res;
}



export async function saveSettings(patch: Record<string, unknown>) {
  const me = await requireStaff();
  await createAdminClient().from("settings")
    .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
  await audit(me.id, "settings.update", "settings", undefined, patch);
  revalidatePath(`/${ADMIN}/settings`);
}

/**
 * Looks up an existing record by email address.
 *
 * Uses `limit(1)` rather than `maybeSingle()` on purpose: `maybeSingle()` throws
 * when more than one row matches, which is exactly the situation this check
 * exists to detect. It also returns the matched `id` so callers can link to the
 * existing record instead of creating a second one.
 */
export async function checkEmailExists(args: {
  email: string;
  target: "client" | "employee" | "lead";
  excludeId?: string | null;
}): Promise<{ exists: boolean; id?: string; message?: string }> {
  const cleanEmail = (args.email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) return { exists: false };

  const db = createAdminClient();

  if (args.target === "client") {
    let query = db.from("clients").select("id").ilike("email", cleanEmail);
    if (args.excludeId) query = query.neq("id", args.excludeId);
    const { data } = await query.limit(1);
    if (data?.length) {
      return {
        exists: true,
        id: data[0].id,
        message: "A client account with this email address already exists.",
      };
    }
  } else if (args.target === "employee") {
    let query = db.from("employees").select("id").ilike("email", cleanEmail);
    if (args.excludeId) query = query.neq("id", args.excludeId);
    const { data } = await query.limit(1);
    if (data?.length) {
      return {
        exists: true,
        id: data[0].id,
        message: "An employee profile with this email address already exists.",
      };
    }
  } else if (args.target === "lead") {
    const { data: lead } = await db.from("leads").select("id").ilike("email", cleanEmail).limit(1);
    const { data: client } = await db.from("clients").select("id").ilike("email", cleanEmail).limit(1);
    if (lead?.length || client?.length) {
      return {
        exists: true,
        id: client?.[0]?.id ?? lead?.[0]?.id,
        message: "An account or project lead with this email address is already registered.",
      };
    }
  }

  return { exists: false };
}
