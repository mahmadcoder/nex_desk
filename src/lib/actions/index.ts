"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import type { DocType } from "@/lib/pdf/generate";
import { getLiveExchangeRates, convertCurrency, DEFAULT_RATES } from "@/lib/currency";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data: profile } = await supabase.from("profiles")
    .select("id, role, full_name, is_active").eq("id", user.id).single();
  if (!profile?.is_active || !["owner", "admin", "staff"].includes(profile.role)) {
    throw new Error("Not authorised");
  }
  return profile;
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
  redirect(`/${ADMIN}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${ADMIN}/login`);
}



export async function updateLead(id: string, patch: Record<string, unknown>) {
  const me = await requireStaff();
  const db = createAdminClient();
  await db.from("leads").update(patch).eq("id", id);
  await audit(me.id, "lead.update", "leads", id, patch);
  revalidatePath(`/${ADMIN}/leads`);
}


export async function convertLeadToClient(leadId: string) {
  const me = await requireStaff();
  const db = createAdminClient();
  const { data: lead } = await db.from("leads").select("*").eq("id", leadId).single();
  if (!lead) throw new Error("Lead not found");

  const { data: client } = await db.from("clients").insert({
    name: lead.name, email: lead.email, phone: lead.phone, company: lead.company,
    city: lead.city, country: lead.country, lead_id: lead.id,
    notes: lead.message, source: lead.source || "website",
  }).select().single();

  await db.from("leads").update({ status: "won" }).eq("id", leadId);
  await audit(me.id, "lead.convert", "clients", client!.id);
  revalidatePath(`/${ADMIN}/clients`);
  redirect(`/${ADMIN}/clients/${client!.id}`);
}



export async function saveClient(id: string | null, data: Record<string, unknown>) {
  const me = await requireStaff();
  const db = createAdminClient();
  const res = id
    ? await db.from("clients").update(data).eq("id", id).select().single()
    : await db.from("clients").insert(data).select().single();
  if (res.error) throw res.error;
  await audit(me.id, id ? "client.update" : "client.create", "clients", res.data.id);
  
  if (!id && res.data?.id) {
    try {
      await ensureClientPortalAccount(res.data.id);
    } catch (e) {
      console.error("Portal provisioning notice on saveClient:", e);
    }
  }

  revalidatePath(`/${ADMIN}/clients`);
  return res.data;
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
  redirect(`/${ADMIN}/clients`);
}

export async function updateClientPermissions(id: string, permissions: Record<string, boolean>) {
  const me = await requireStaff();
  const db = createAdminClient();
  await db.from("clients").update({ client_permissions: permissions }).eq("id", id);
  await audit(me.id, "client.permissions", "clients", id, permissions);
  revalidatePath(`/${ADMIN}/clients/${id}`);
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

  const token = client.portal_access_token || Math.random().toString(36).substring(2) + Date.now().toString(36);

  const { data: updated } = await db.from("clients").update({
    profile_id: profileId,
    portal_password_preview: password,
    portal_access_token: token,
  }).eq("id", clientId).select().single();

  await audit(me.id, "client.credentials", "clients", clientId, { email: client.email });
  revalidatePath(`/${ADMIN}/clients`);
  return updated;
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nexdesk.com";
    const portalUrl = `${siteUrl}/portal/login`;
    const passwordMsg = clientAcc?.portal_password_preview
      ? `\n\nYour Portal Credentials:\nEmail: ${deal.clients.email}\nPassword: ${clientAcc.portal_password_preview}\nLogin link: ${portalUrl}`
      : `\n\nAccess your client portal at: ${portalUrl}`;

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
        portal_url: portalUrl + passwordMsg,
        sender_name: me.full_name ?? "Nex Desk",
      },
    });

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
}

export async function toggleMilestone(id: string, done: boolean) {
  const me = await requireStaff();
  const db = createAdminClient();
  const { data: m } = await db.from("milestones")
    .update({ is_done: done, completed_at: done ? new Date().toISOString() : null })
    .eq("id", id).select("project_id").single();


  if (m) {
    const { data: all } = await db.from("milestones").select("is_done").eq("project_id", m.project_id);
    const pct = all?.length ? Math.round((all.filter((x) => x.is_done).length / all.length) * 100) : 0;
    await db.from("projects").update({ progress: pct }).eq("id", m.project_id);
  }
  await audit(me.id, "milestone.toggle", "milestones", id, { done });
  revalidatePath(`/${ADMIN}/projects`, "layout");
}



export async function sendClientEmail(args: {
  templateKey: string; to: string; clientId?: string; projectId?: string;
  subject: string; body: string; attach?: { type: DocType; id: string };
}) {
  const me = await requireStaff();
  const res = await sendEmail({
    templateKey: args.templateKey,
    to: args.to,
    subjectOverride: args.subject,
    bodyOverride: args.body,
    clientId: args.clientId,
    projectId: args.projectId,
    attach: args.attach,
    actorId: me.id,
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
