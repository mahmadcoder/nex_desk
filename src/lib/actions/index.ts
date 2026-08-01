"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireStaff, requireOwnerAdmin } from "@/lib/auth/guards";
import { sendEmail, adminNotifyAddress, notifyEmailChange } from "@/lib/email/send";
import type { DocType } from "@/lib/pdf/generate";
import { getLiveExchangeRates, convertCurrency, DEFAULT_RATES } from "@/lib/currency";
import { getSiteBaseUrl, currencyForCountry, money } from "@/lib/utils";
import { tryEncrypt, decryptSecret } from "@/lib/crypto";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/**
 * Actor identity for audit rows.
 * `audit_log.actor_id` is a FK to profiles, so a login without a profile row
 * must record NULL rather than a dangling id.
 */
async function audit(actorId: string, action: string, entity: string, entityId?: string, meta?: any) {
  const db = createAdminClient();
  const { data: actor } = await db
    .from("profiles").select("id").eq("id", actorId).maybeSingle();

  await db.from("audit_log").insert({
    actor_id: actor?.id ?? null,
    action, entity, entity_id: entityId, meta: meta ?? {},
  });
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
  const me = await requireOwnerAdmin();
  const db = createAdminClient();
  await db.from("leads").update(patch).eq("id", id);
  await audit(me.userId, "lead.update", "leads", id, patch);
  revalidatePath(`/${ADMIN}/leads`);
}

/**
 * Deletes a lead outright. For website spam, which there is no point keeping.
 *
 * A real enquiry that went nowhere should be marked `lost`, and anything
 * questionable `spam` — both keep the record. This is the last resort.
 */
export async function deleteLead(id: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  // Audit before deleting, so the log still says who this was.
  const { data: lead } = await db
    .from("leads").select("name, email, status").eq("id", id).maybeSingle();

  const { error } = await db.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await audit(me.userId, "lead.delete", "leads", id, {
    name: lead?.name ?? null, email: lead?.email ?? null, status: lead?.status ?? null,
  });
  revalidatePath(`/${ADMIN}/leads`);
  return { ok: true as const };
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
  const me = await requireOwnerAdmin();
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
    // Bill people in their own currency. This was never set, so every converted
    // lead took the schema default of PKR — and `DealForm` adopts the client's
    // currency, so a US lead ended up with a rupee deal, invoice and agreement.
    preferred_currency: currencyForCountry(lead.country),
    // Free text from the form, e.g. "Ayesha at Zenith". Kept as a note; an
    // admin links it to the actual client record on the profile, which is what
    // drives the referrer's thank-you and their "referred N clients" count.
    referral_note: lead.referred_by || null,
    notes: lead.message, source: lead.referred_by ? "referral" : lead.source || "website",
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

  await audit(me.userId, "lead.convert", "clients", client.id);
  revalidatePath(`/${ADMIN}/leads`);
  revalidatePath(`/${ADMIN}/clients`);
  redirect(`/${ADMIN}/clients/${client.id}`);
}



export async function saveClient(id: string | null, data: Record<string, unknown>) {
  const me = await requireOwnerAdmin();
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
  await audit(me.userId, id ? "client.update" : "client.create", "clients", res.data.id);

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
        actorId: me.userId,
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
  const me = await requireOwnerAdmin();
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
  await audit(me.userId, "client.delete", "clients", id);
  revalidatePath(`/${ADMIN}/clients`);
  return { success: true };
}

export async function updateClientPermissions(id: string, permissions: Record<string, boolean>) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();
  await db.from("clients").update({ client_permissions: permissions }).eq("id", id);
  await audit(me.userId, "client.permissions", "clients", id, permissions);
  revalidatePath(`/${ADMIN}/clients/${id}`);
}

export async function getClientEmailByToken(token: string) {
  if (!token) return null;
  const db = createAdminClient();
  const { data } = await db.from("clients").select("email").eq("portal_access_token", token).maybeSingle();
  return data?.email || null;
}

/**
 * Who is arriving, from the token in their emailed portal link.
 *
 * Lets the sign-in page greet them by name before they have signed in — the
 * link came from us, so we already know who we sent it to. Returns only a
 * first name and the email: enough to be welcoming, nothing worth harvesting
 * if someone guesses a token.
 */
export async function getPortalGreeting(token: string) {
  if (!token) return null;
  const db = createAdminClient();
  const { data } = await db
    .from("clients").select("name, email, company").eq("portal_access_token", token).maybeSingle();
  if (!data) return null;

  return {
    firstName: String(data.name || "").trim().split(/\s+/)[0] || null,
    email: data.email as string,
    company: (data.company as string) || null,
  };
}

export async function ensureClientPortalAccount(clientId: string, customPassword?: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("*").eq("id", clientId).single();
  if (!client) throw new Error("Client not found");

  // A stored preview may be ciphertext, so it has to be decrypted before it
  // can be reused as a password.
  let password = customPassword || decryptSecret(client.portal_password_preview);
  if (!password) {
    password = "Nex#" + Math.floor(100000 + Math.random() * 900000);
  }

  // The stored copy is encrypted and short-lived: useful while you are still
  // handing the login over, gone before it can become a permanent liability.
  // Supabase auth holds the real password either way, so nothing is lost.
  const previewExpiry = new Date(Date.now() + 72 * 3600e3).toISOString();


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
    // tryEncrypt returns null when CREDENTIALS_KEY is unset — storing nothing
    // is the correct failure, never a plaintext fallback.
    portal_password_preview: tryEncrypt(password),
    password_preview_expires_at: previewExpiry,
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

  await audit(me.userId, "client.credentials", "clients", clientId, { email: client.email });
  revalidatePath(`/${ADMIN}/clients`);
  return { ...updated, credentialsEmailed };
}


export async function lockDeal(dealData: any, options: { sendEmail: boolean } = { sendEmail: true }) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const { deliverables, payment_schedule, milestones, ...rest } = dealData;

  const { data: deal, error } = await db.from("deals").upsert({
    ...rest,
    deliverables, payment_schedule,
    status: "locked",
    locked_at: new Date().toISOString(),
    locked_by: me.userId,
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
    lead_member: me.userId,
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


  /* ---------- Invoices: one per payment stage ----------------------------
   *
   * Every stage of the agreed payment schedule becomes its own invoice up
   * front. Stage 1 is issued and emailed now; later stages are created as
   * `draft` with their agreed due dates and issued later via `sendInvoice`.
   *
   * Previously only stage 1 was ever invoiced, and nothing anywhere could
   * raise the rest. That made the client portal understate the contract (a
   * $1500 deal showed $750 "billed" and "settled in full" after the advance)
   * and it silently unlocked the handover document, because the handover gate
   * compares paid against *invoiced*.
   * -------------------------------------------------------------------- */
  const stages: any[] = (payment_schedule ?? []).length
    ? payment_schedule
    : [{
        label: "Advance payment",
        amount: (Number(deal.total) * Number(deal.advance_percent ?? 50)) / 100,
        due_on: null,
      }];

  const createdInvoices: any[] = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const amount = Number(stage?.amount ?? 0);
    if (!(amount > 0)) continue;

    const { data: invNo } = await db.rpc("next_invoice_no");

    const { data: invoice, error: invErr } = await db.from("invoices").insert({
      invoice_no: invNo,
      client_id: deal.client_id,
      project_id: project?.id,
      deal_id: deal.id,
      stage_index: i,
      line_items: [{ item: `${deal.title} — ${stage?.label ?? `Stage ${i + 1}`}`, qty: 1, price: amount }],
      // `deals.total` is already tax-inclusive (DealForm adds tax before
      // splitting the schedule), so stage amounts must NOT be taxed again.
      // The old code re-applied tax_percent here and double-charged it.
      subtotal: amount,
      tax_percent: 0,
      total: amount,
      currency: deal.currency,
      due_date: stage?.due_on
        ?? (i === 0 ? new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) : null),
      // Only the first stage is issued now. The rest wait for their milestone.
      status: i === 0 ? "sent" : "draft",
    }).select().single();

    if (invErr) {
      // 23505 = this stage is already invoiced (re-lock). Not fatal.
      if (invErr.code !== "23505") {
        console.error(`Could not raise invoice for stage ${i}:`, invErr);
      }
      continue;
    }
    if (invoice) createdInvoices.push(invoice);
  }

  const invoice = createdInvoices.find((v) => v.stage_index === 0) ?? createdInvoices[0] ?? null;


  // Is this their first deal, or are they buying another service? A returning
  // client should not be welcomed as though nothing had happened before.
  const { data: theirDeals } = await db
    .from("deals").select("id, title, total, currency, status").eq("client_id", deal.client_id);

  const otherLocked = (theirDeals ?? []).filter(
    (d) => d.status === "locked" && d.id !== deal.id
  );
  const isAdditionalService = otherLocked.length > 0;

  if (options.sendEmail) {
    const siteUrl = getSiteBaseUrl();
    const portalUrl = clientAcc?.portal_access_token
      ? `${siteUrl}/portal/login?key=${clientAcc.portal_access_token}`
      : `${siteUrl}/portal/login`;

    // Combined position across everything they hold in this currency.
    const combined = [...otherLocked, deal]
      .filter((d) => String(d.currency).toUpperCase() === String(deal.currency).toUpperCase())
      .reduce((s, d) => s + Number(d.total || 0), 0);

    await sendEmail({
      templateKey: isAdditionalService ? "client_service_added" : "deal_locked",
      to: deal.clients.email,
      clientId: deal.client_id,
      projectId: project?.id,
      actorId: me.userId,
      attach: { type: "agreement", id: deal.id },
      vars: {
        client_name: deal.clients.name,
        project_name: deal.title,
        service_name: deal.title,
        deal_no: deal.deal_no,
        amount: Number(deal.total).toLocaleString(),
        currency: deal.currency,
        service_count: otherLocked.length + 1,
        combined_total: `${deal.currency} ${combined.toLocaleString()}`,
        deadline: deal.deadline ?? "as agreed",
        portal_url: portalUrl,
        sender_name: me.fullName ?? "Nex Desk",
      },
    });

    // Credentials go in their own email rather than being appended to the
    // portal_url variable — the layout renders a bare URL as a CTA button, so
    // concatenating a password onto it produced garbled output.
    const invitePassword = decryptSecret(clientAcc?.portal_password_preview);
    if (invitePassword) {
      await sendEmail({
        templateKey: "portal_invite",
        to: deal.clients.email,
        clientId: deal.client_id,
        actorId: me.userId,
        vars: {
          client_name: deal.clients.name,
          project_name: deal.title,
          portal_url: portalUrl,
          client_email: deal.clients.email,
          client_password: invitePassword,
          sender_name: me.fullName ?? "Nex Desk",
        },
      });
    }

    // Only the issued (stage 1) invoice is emailed. Drafts stay internal until
    // their milestone is reached and you press "Send invoice".
    if (invoice && invoice.status === "sent") {
      await sendEmail({
        templateKey: "invoice_sent",
        to: deal.clients.email,
        clientId: deal.client_id,
        actorId: me.userId,
        attach: { type: "invoice", id: invoice.id },
        vars: {
          client_name: deal.clients.name,
          invoice_no: invoice.invoice_no,
          amount: Number(invoice.total).toLocaleString(),
          currency: invoice.currency,
          due_date: invoice.due_date,
          sender_name: me.fullName ?? "Nex Desk",
        },
      });
    }
  }

  // An existing client buying more is the best news the agency gets — say so
  // internally, with the combined position rather than just the new line.
  if (isAdditionalService) {
    const combinedAll = [...otherLocked, deal]
      .filter((d) => String(d.currency).toUpperCase() === String(deal.currency).toUpperCase())
      .reduce((s, d) => s + Number(d.total || 0), 0);

    await sendEmail({
      templateKey: "admin_service_added_notice",
      to: await adminNotifyAddress(),
      clientId: deal.client_id,
      actorId: me.userId,
      vars: {
        client_name: deal.clients.name,
        service_name: deal.title,
        amount: Number(deal.total).toLocaleString(),
        currency: deal.currency,
        service_count: otherLocked.length + 1,
        combined_total: `${deal.currency} ${combinedAll.toLocaleString()}`,
        admin_url: `${getSiteBaseUrl()}/${ADMIN}/clients/${deal.client_id}`,
      },
    }).catch((e) => console.error("Service-added notice failed:", e));
  }

  // Buying again reactivates a dormant client automatically — nobody should
  // have to remember to flip that by hand.
  await db.from("clients")
    .update({ lifecycle: "active", is_active: true })
    .eq("id", deal.client_id)
    .neq("lifecycle", "active");

  await audit(me.userId, "deal.lock", "deals", deal.id, {
    total: deal.total, project: project?.id, invoices: createdInvoices.length,
    additional_service: isAdditionalService,
  });
  revalidatePath(`/${ADMIN}`, "layout");
  return {
    dealId: deal.id,
    projectId: project?.id,
    invoiceId: invoice?.id,
    invoicesCreated: createdInvoices.length,
    isAdditionalService,
  };
}

/**
 * Issues a draft invoice: flips it to `sent` and emails it to the client.
 *
 * Staged invoices are created at lock time as drafts so the contract value is
 * complete from day one, but the client is only billed when the milestone is
 * actually reached.
 */
export async function sendInvoice(invoiceId: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const { data: invoice } = await db
    .from("invoices").select("*, clients(id, name, email)").eq("id", invoiceId).single();
  if (!invoice) throw new Error("Invoice not found.");

  if (invoice.status !== "draft") {
    throw new Error(`Invoice ${invoice.invoice_no} has already been issued.`);
  }

  const client = invoice.clients as any;
  if (!client?.email) throw new Error("This client has no email address on file.");

  const dueDate =
    invoice.due_date ?? new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  const { error: updErr } = await db.from("invoices")
    .update({ status: "sent", issue_date: new Date().toISOString().slice(0, 10), due_date: dueDate })
    .eq("id", invoiceId);
  if (updErr) throw new Error(updErr.message);

  const result = await sendEmail({
    templateKey: "invoice_sent",
    to: client.email,
    clientId: client.id,
    projectId: invoice.project_id ?? undefined,
    actorId: me.userId,
    attach: { type: "invoice", id: invoice.id },
    vars: {
      client_name: client.name,
      invoice_no: invoice.invoice_no,
      amount: Number(invoice.total).toLocaleString(),
      currency: invoice.currency,
      due_date: dueDate,
      sender_name: me.fullName ?? "Nex Desk",
    },
  });

  await audit(me.userId, "invoice.send", "invoices", invoiceId, { invoice_no: invoice.invoice_no });
  revalidatePath(`/${ADMIN}/invoices`);
  if (invoice.project_id) revalidatePath(`/${ADMIN}/projects/${invoice.project_id}`);
  revalidatePath("/portal");

  return { ok: result.ok, error: result.ok ? undefined : result.error, invoiceNo: invoice.invoice_no };
}


export async function recordPayment(data: any, notify = true) {
  const me = await requireOwnerAdmin();
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
      recorded_by: me.userId,
      exchange_rate: exRate,
      realized_base_amount: realizedBase,
    })
    .select("*, clients(*)").single();
  if (error) throw error;

  // Is this the payment that clears the whole contract? The trigger has already
  // synced the invoice by now, so compare paid against the deal, not against
  // the invoices raised so far.
  let settledInFull = false;
  let contractTotal = 0;
  if (data.invoice_id) {
    const { data: inv } = await db
      .from("invoices").select("deal_id, currency").eq("id", data.invoice_id).maybeSingle();

    if (inv?.deal_id) {
      const [{ data: deal }, { data: dealInvoices }] = await Promise.all([
        db.from("deals").select("total, currency").eq("id", inv.deal_id).maybeSingle(),
        db.from("invoices").select("amount_paid, currency").eq("deal_id", inv.deal_id),
      ]);

      if (deal) {
        contractTotal = Number(deal.total || 0);
        const paidOnDeal = (dealInvoices ?? [])
          .filter((i) => String(i.currency).toUpperCase() === String(deal.currency).toUpperCase())
          .reduce((s, i) => s + Number(i.amount_paid || 0), 0);
        settledInFull = contractTotal > 0 && paidOnDeal >= contractTotal - 0.01;
      }
    }
  }

  if (notify) {
    // 1. Client Receipt Email — the final one says so, so nobody is left
    //    wondering whether another invoice is still coming.
    await sendEmail({
      templateKey: settledInFull ? "invoice_final_settled" : "payment_received",
      to: payment.clients.email,
      clientId: payment.client_id,
      actorId: me.userId,
      attach: { type: "receipt", id: payment.id },
      vars: {
        client_name: payment.clients.name,
        amount: Number(payment.amount).toLocaleString(),
        currency: payment.currency,
        contract_total: contractTotal ? money(contractTotal, payment.currency) : "",
        project_name: data.project_name ?? "your project",
        sender_name: me.fullName ?? "Nex Desk",
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

  await audit(me.userId, "payment.record", "payments", payment.id, { amount: payment.amount });
  revalidatePath(`/${ADMIN}`, "layout");
  return payment;
}



export async function updateProject(id: string, patch: Record<string, unknown>) {
  const me = await requireOwnerAdmin();
  await createAdminClient().from("projects").update(patch).eq("id", id);
  await audit(me.userId, "project.update", "projects", id, patch);
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
  const me = await requireOwnerAdmin();
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
    actorId: me.userId,
    attach: { type: "progress_report", id: project.id },
    vars: {
      client_name: client.name,
      project_name: project.name,
      progress: project.progress,
      portal_url: `${getSiteBaseUrl()}/portal`,
      staging_url: project.staging_url ?? "",
      recent_updates: recentUpdates,
      milestone_summary: milestoneSummary,
      sender_name: me.fullName ?? "Nex Desk",
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
/**
 * Recomputes a project's progress from BOTH sources of truth.
 *
 * This used to return the milestone percentage whenever any milestone existed
 * and silently discard `bump`. `lockDeal` creates milestones from the payment
 * schedule on every deal, so in practice every project had milestones — which
 * meant the `progress_delta` a staff member entered on a daily work log was
 * thrown away, every time, on every project. The bar never moved for the
 * client, the staff member or the admin.
 *
 * Now the two combine: milestones give the structural figure, logged deltas
 * accumulate in `projects.manual_progress`, and the project shows whichever is
 * further along. Reporting real work can only ever move the bar forwards.
 */
export async function recomputeProjectProgress(projectId: string, bump = 0) {
  // Exported from a "use server" module, so this is a public endpoint that
  // writes the client-visible progress figure — it needs its own guard even
  // though every internal caller is already authenticated.
  await requireStaff();
  const db = createAdminClient();

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  const [{ data: all }, { data: project }] = await Promise.all([
    db.from("milestones").select("is_done").eq("project_id", projectId),
    db.from("projects").select("progress, manual_progress").eq("id", projectId).maybeSingle(),
  ]);

  // Deltas accumulate and persist, so they survive the next milestone tick.
  const manual = clamp(Number(project?.manual_progress ?? 0) + Number(bump || 0));

  const milestonePct = all?.length
    ? clamp((all.filter((x) => x.is_done).length / all.length) * 100)
    : 0;

  // `max` rather than a sum: they measure the same thing two ways, so adding
  // them would let a project read 140% complete.
  const pct = all?.length ? Math.max(milestonePct, manual) : manual;

  await db.from("projects")
    .update({ progress: clamp(pct), manual_progress: manual })
    .eq("id", projectId);

  return clamp(pct);
}

/**
 * Staff-accessible: reporting delivery progress is the job of whoever does the
 * work, and this is what drives the client's progress bar.
 */
export async function toggleMilestone(id: string, done: boolean) {
  const me = await requireStaff();
  const db = createAdminClient();
  const { data: m } = await db.from("milestones")
    .update({ is_done: done, completed_at: done ? new Date().toISOString() : null })
    .eq("id", id).select("project_id").single();

  if (m) await recomputeProjectProgress(m.project_id);

  await audit(me.userId, "milestone.toggle", "milestones", id, { done });
  revalidatePath(`/${ADMIN}/projects`, "layout");
  revalidatePath("/portal");
}



export async function sendClientEmail(args: {
  templateKey: string; to: string; clientId?: string; projectId?: string;
  subject: string; body: string; attach?: { type: DocType; id: string };
  language?: "en" | "ar" | "fr" | "de" | "es";
}) {
  const me = await requireOwnerAdmin();
  const res = await sendEmail({
    templateKey: args.templateKey,
    to: args.to,
    clientId: args.clientId,
    projectId: args.projectId,
    actorId: me.userId,
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
  const me = await requireOwnerAdmin();
  await createAdminClient().from("settings")
    .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
  await audit(me.userId, "settings.update", "settings", undefined, patch);
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
