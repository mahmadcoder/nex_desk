"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireStaff, requireOwnerAdmin } from "@/lib/auth/guards";
import { sendEmail, adminNotifyAddress, notifyEmailChange } from "@/lib/email/send";
import type { DocType } from "@/lib/pdf/generate";
import { getLiveExchangeRates, convertCurrency, DEFAULT_RATES } from "@/lib/currency";
import { getSiteBaseUrl, currencyForCountry, money, moneyMulti } from "@/lib/utils";
import { tryEncrypt, decryptSecret } from "@/lib/crypto";
import { provisionLockedDeal } from "@/lib/deals/provision";
import { contractPosition } from "@/lib/billing";
import { diffFields, changeLines, CLIENT_FIELDS } from "@/lib/diff";

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
  // The whole row, not just the address: the audit entry used to record that a
  // client changed and never what changed in it, so nothing could tell them.
  let previous: Record<string, any> | null = null;
  if (id) {
    const { data: before } = await db.from("clients").select("*").eq("id", id).maybeSingle();
    previous = before ?? null;
  }

  const res = id
    ? await db.from("clients").update(data).eq("id", id).select().single()
    : await db.from("clients").insert(data).select().single();
  if (res.error) throw res.error;
  const changes = id ? diffFields(previous, data, CLIENT_FIELDS) : [];
  await audit(me.userId, id ? "client.update" : "client.create", "clients", res.data.id, {
    changes: changes.map((c) => ({ field: c.key, from: c.from, to: c.to })),
  });

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

    // Everything else that changed, in one mail. The address change above has
    // its own dedicated notice, so it is excluded here rather than sent twice.
    const notifiable = changes.filter((c) => c.notify && c.key !== "email");
    if (notifiable.length && res.data?.email) {
      const sent = await sendEmail({
        templateKey: "profile_updated",
        to: String(res.data.email),
        clientId: String(res.data.id),
        actorId: me.userId,
        vars: {
          name: String(res.data?.name ?? "there"),
          changes: changeLines(notifiable),
        },
      });
      if (!sent.ok) console.error("saveClient: profile_updated email failed:", sent.error);
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
    .from("clients")
    .select("name, email, company, portal_login_count")
    .eq("portal_access_token", token)
    .maybeSingle();
  if (!data) return null;

  return {
    firstName: String(data.name || "").trim().split(/\s+/)[0] || null,
    email: data.email as string,
    company: (data.company as string) || null,
    // Never signed in → "Welcome". Been here before → "Welcome back".
    isFirstTime: Number(data.portal_login_count ?? 0) === 0,
  };
}

/**
 * Records a successful portal sign-in.
 *
 * Called by the login page once Supabase has authenticated, so it is the real
 * sign-in count rather than a page-view count — opening the portal in three
 * tabs is one visit, not three.
 *
 * Identity comes from the authenticated session, never from an argument.
 */
export async function recordPortalLogin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const };

  const db = createAdminClient();
  const { data: client } = await db
    .from("clients").select("id, name, portal_login_count").eq("email", user.email).maybeSingle();
  if (!client) return { ok: false as const };

  const count = Number(client.portal_login_count ?? 0);

  await db.from("clients").update({
    portal_login_count: count + 1,
    last_portal_login_at: new Date().toISOString(),
  }).eq("id", client.id);

  return {
    ok: true as const,
    // What the greeting should say NEXT, i.e. before this visit was counted.
    isFirstTime: count === 0,
    firstName: String(client.name || "").trim().split(/\s+/)[0] || null,
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

  // Auto provision / update client portal credentials upon locking deal.
  // Resolved here rather than inside provisionLockedDeal so that module can
  // stay free of any import from this one.
  let clientAcc: any = null;
  try {
    clientAcc = await ensureClientPortalAccount(deal.client_id);
  } catch (e) {
    console.error("Portal account provision error on lockDeal:", e);
  }

  // Everything downstream — project, milestones, stage invoices, emails — is
  // shared with the quote pipeline, which reaches the same place via
  // lockQuote once a client says yes to a quotation.
  return provisionLockedDeal(
    { ...deal, payment_schedule, milestones },
    me,
    clientAcc,
    options
  );
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

  // The bank charge cannot exceed the payment it was taken from. The database
  // enforces that too, but a mistyped figure should be quietly corrected here
  // rather than surfacing as a constraint violation.
  const payFee = Math.max(0, Math.min(Number(data.fee) || 0, payAmount));

  const { data: payment, error } = await db.from("payments")
    .insert({
      ...data,
      fee: payFee,
      recorded_by: me.userId,
      exchange_rate: exRate,
      realized_base_amount: realizedBase,
    })
    .select("*, clients(*)").single();
  if (error) throw error;

  /* ---------- Is this the payment that clears everything? ----------------
   *
   * This used to walk from the paid invoice to its deal, and only that deal.
   * Three levels of nesting with no `else` at any of them, so any miss fell
   * through in silence to the ordinary receipt — which reads "your next
   * progress update will follow shortly", the opposite message.
   *
   * The miss that actually happened: the last thing paid before handover is
   * very often a change request or a re-billed cost, and both carry
   * `deal_id = NULL`. The walk stopped at the first step and the client was
   * never told they were square.
   *
   * So the question is asked of the CLIENT'S WHOLE POSITION instead, through
   * the same `contractPosition` every screen uses. That fixes the reverse case
   * too: paying the final stage while an agreed change request is still
   * outstanding no longer claims everything is settled.
   * -------------------------------------------------------------------- */
  let settledInFull = false;
  let contractTotal = 0;
  let contractCurrency = payment.currency;
  let projectName = "your project";
  let skipReason: string | null = null;

  try {
    const [{ data: clientDeals }, { data: clientInvoices }, { data: clientCRs }] =
      await Promise.all([
        db.from("deals")
          .select("id, total, currency, status, is_retainer")
          .eq("client_id", payment.client_id),
        db.from("invoices")
          .select("id, total, amount_paid, currency, status, deal_id, stage_index, project_id")
          .eq("client_id", payment.client_id),
        db.from("change_requests")
          .select("id, status, quoted_amount, currency, invoice_id")
          .eq("client_id", payment.client_id),
      ]);

    const locked = (clientDeals ?? []).filter((d) => d.status === "locked");

    // A recurring agreement is never "settled in full" — that is the point of
    // one. Any retainer on the account suppresses the claim entirely.
    const hasRetainer = locked.some((d) => d.is_retainer);

    const pos = contractPosition(locked, clientInvoices ?? [], clientCRs ?? []);

    contractTotal = pos.contracted.reduce((s, t) => s + t.total, 0);
    contractCurrency = pos.contracted[0]?.currency ?? payment.currency;

    if (hasRetainer) {
      skipReason = "the client is on a retainer, which never settles in full";
    } else if (!pos.contracted.length) {
      skipReason = "no locked agreement to measure against";
    } else {
      settledInFull = pos.outstanding.length === 0;
      if (!settledInFull) {
        skipReason = `still outstanding: ${moneyMulti(pos.outstanding)}`;
      }
    }

    // The template names the project, and no caller has ever passed it — so
    // every settlement email that did send read "no further invoices for your
    // project". It cannot come through `data`, which is spread straight into
    // the payments insert, so it is resolved from the invoice here.
    const paidInvoice = (clientInvoices ?? []).find((i) => i.id === data.invoice_id);
    if (paidInvoice?.project_id) {
      const { data: proj } = await db
        .from("projects").select("name").eq("id", paidInvoice.project_id).maybeSingle();
      if (proj?.name) projectName = proj.name;
    }
  } catch (e) {
    skipReason = "the settlement check itself failed";
    console.error("recordPayment: could not work out the settlement position", e);
  }

  // Every fall-through used to be invisible. Saying why turns the next report
  // of "the client never got the final email" into a one-minute diagnosis.
  if (!settledInFull && skipReason) {
    console.info(
      `recordPayment: sending the ordinary receipt — ${skipReason}. ` +
      `(payment ${payment.id}, client ${payment.client_id})`
    );
  }

  if (notify) {
    // 1. Client Receipt Email — the final one says so, so nobody is left
    //    wondering whether another invoice is still coming.
    const receipt = await sendEmail({
      templateKey: settledInFull ? "invoice_final_settled" : "payment_received",
      to: payment.clients.email,
      clientId: payment.client_id,
      actorId: me.userId,
      attach: { type: "receipt", id: payment.id },
      vars: {
        client_name: payment.clients.name,
        amount: Number(payment.amount).toLocaleString(),
        currency: payment.currency,
        // Labelled in the CONTRACT's currency. It was taking the figure from
        // the agreement and the symbol from the payment, so a USD contract
        // paid in rupees printed the USD total marked "Rs".
        contract_total: contractTotal ? money(contractTotal, contractCurrency) : "",
        project_name: projectName,
        sender_name: me.fullName ?? "Nex Desk",
      },
    });

    // The result was discarded, so a template that refused to render — a blank
    // row in the Email Centre is enough — reported success and nobody knew.
    if (!receipt.ok) {
      console.error(
        `recordPayment: the client receipt did not send (payment ${payment.id}):`,
        receipt.error
      );
    }

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



/**
 * Saves the project controls, and acts on the two changes that mean something
 * to the client rather than just to the board.
 *
 * `staging_ready` and `project_on_hold` have existed as email templates since
 * launch and had never been sent: a staging link was pasted in and the client
 * was never told it was there, and a project was paused with nothing in
 * writing about it. Both are transitions, so they are detected by comparing
 * against the row as it stands before the update.
 */
export async function updateProject(id: string, patch: Record<string, unknown>) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const { data: before } = await db
    .from("projects")
    .select("id, name, status, staging_url, deadline, staging_shared_at, paused_at, client_id, clients(id, name, email)")
    .eq("id", id)
    .maybeSingle();

  const client = (before?.clients as any) ?? null;
  const nextStaging = patch.staging_url ? String(patch.staging_url) : null;
  const nextStatus = patch.status ? String(patch.status) : before?.status;

  // Only a link appearing where there was none. A corrected typo in an
  // existing URL must not re-announce the review, and re-sharing the same
  // link is what "Send progress update" is for.
  const stagingJustShared =
    !!nextStaging && !before?.staging_url && !!client?.email;

  const justPaused =
    nextStatus === "on_hold" && before?.status !== "on_hold" && !!client?.email;

  const extra: Record<string, unknown> = {};
  if (stagingJustShared) {
    extra.staging_shared_at = new Date().toISOString();
    // A fresh review round starts its own chase sequence.
    extra.feedback_nudged_at = null;
    extra.feedback_nudge_count = 0;
  }
  if (justPaused) extra.paused_at = new Date().toISOString();
  // Coming off hold clears the stamp, so a second pause is confirmed again.
  if (nextStatus !== "on_hold" && before?.paused_at) extra.paused_at = null;

  await db.from("projects").update({ ...patch, ...extra }).eq("id", id);
  await audit(me.userId, "project.update", "projects", id, patch);

  // Emails are best-effort: a delivery failure must not lose the save the
  // admin just made.
  if (stagingJustShared) {
    await sendEmail({
      templateKey: "staging_ready",
      to: client.email,
      clientId: before!.client_id,
      projectId: id,
      actorId: me.userId,
      vars: {
        client_name: client.name,
        project_name: before!.name,
        staging_url: nextStaging!,
        deadline: before!.deadline ?? "the agreed date",
        sender_name: me.fullName ?? "Nex Desk",
      },
    }).catch((e) => console.error("Staging-ready email failed:", e));
  }

  if (justPaused) {
    await sendEmail({
      templateKey: "project_on_hold",
      to: client.email,
      clientId: before!.client_id,
      projectId: id,
      actorId: me.userId,
      vars: {
        client_name: client.name,
        project_name: before!.name,
        sender_name: me.fullName ?? "Nex Desk",
      },
    }).catch((e) => console.error("On-hold email failed:", e));
  }

  revalidatePath(`/${ADMIN}/projects/${id}`);
  revalidatePath("/portal");
  return { ok: true as const, stagingAnnounced: stagingJustShared, pauseAnnounced: justPaused };
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
