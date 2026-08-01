"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { sendEmail, adminNotifyAddress } from "@/lib/email/send";
import { asUuid, getSiteBaseUrl } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";

const ADMIN = process.env.ADMIN_PATH || "nx-control";

/* ============================================================
   CLIENT LIFECYCLE
   ============================================================ */

/**
 * Puts a finished client to one side without losing them.
 *
 * `clients.is_active` existed from launch and nothing ever wrote to it, so a
 * client whose work finished two years ago looked exactly like one shipping
 * today. Dormant is not a demotion — it is how you tell the difference between
 * a quiet client and a live one.
 */
export async function setClientDormant(
  clientId: string,
  note?: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(clientId);
  if (!id) return { ok: false, error: "Invalid client reference." };

  const { data: open } = await db
    .from("projects")
    .select("id, name, status")
    .eq("client_id", id)
    .not("status", "in", "(completed,cancelled)");

  // Returned, never thrown. Next.js strips the message from any error thrown
  // inside a Server Action in production, so a thrown refusal reaches the
  // browser as an anonymous 500 and the person is left guessing.
  if (open?.length) {
    const names = open.map((p) => `${p.name} (${String(p.status).replace(/_/g, " ")})`);
    return {
      ok: false,
      error:
        `Still open: ${names.join(", ")}. ` +
        `Mark ${open.length === 1 ? "it" : "them"} completed or cancelled first — ` +
        `a dormant client should have no live work.`,
    };
  }

  // The error is checked rather than discarded. An unchecked Supabase error
  // makes the action throw with no message, which Next.js renders as a bare
  // 500 in the browser console and tells you nothing at all.
  const { error } = await db.from("clients").update({
    lifecycle: "dormant",
    dormant_at: new Date().toISOString(),
    ...(note?.trim() ? { notes: note.trim() } : {}),
  }).eq("id", id);

  if (error) {
    // 42703 = undefined column: the lifecycle migration has not been run.
    return {
      ok: false,
      error:
        error.code === "42703"
          ? "The client lifecycle columns are missing. Run supabase/idempotent_fixes_2026_11.sql, then try again."
          : error.message,
    };
  }

  await recordAudit(me.userId, "client.dormant", "clients", id, {});

  revalidatePath(`/${ADMIN}/clients`);
  revalidatePath(`/${ADMIN}/clients/${id}`);
  revalidatePath(`/${ADMIN}/completed`);
  return { ok: true };
}

/**
 * Brings a returning client back.
 *
 * A client who comes back is the most valuable kind there is — they already
 * trust you — so this is a deliberate, recorded action with a welcome-back
 * email, not just a flag flip. `return_count` makes repeat business visible.
 */
export async function reactivateClient(
  clientId: string,
  notify = true
): Promise<{ ok: boolean; error?: string; emailed?: boolean }> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(clientId);
  if (!id) return { ok: false, error: "Invalid client reference." };

  const { data: client } = await db
    .from("clients").select("id, name, email, lifecycle, return_count").eq("id", id).maybeSingle();
  if (!client) return { ok: false, error: "Client not found." };
  if (client.lifecycle === "active") {
    return { ok: false, error: `${client.name} is already active.` };
  }

  const { error: reErr } = await db.from("clients").update({
    lifecycle: "active",
    is_active: true,
    reactivated_at: new Date().toISOString(),
    return_count: Number(client.return_count ?? 0) + 1,
  }).eq("id", id);

  if (reErr) {
    return {
      ok: false,
      error:
        reErr.code === "42703"
          ? "The client lifecycle columns are missing. Run supabase/idempotent_fixes_2026_11.sql, then try again."
          : reErr.message,
    };
  }

  let emailed = false;
  if (notify && client.email) {
    const res = await sendEmail({
      templateKey: "client_welcome_back",
      to: client.email,
      clientId: id,
      actorId: me.userId,
      vars: {
        client_name: client.name,
        portal_url: `${getSiteBaseUrl()}/portal`,
        sender_name: me.fullName ?? "Nex Desk",
      },
    });
    emailed = res.ok;
  }

  await recordAudit(
    me.userId,
    "client.reactivate",
    "clients",
    id,
    { return_count: Number(client.return_count ?? 0) + 1 }
  );

  revalidatePath(`/${ADMIN}/clients`);
  revalidatePath(`/${ADMIN}/clients/${id}`);
  revalidatePath(`/${ADMIN}/completed`);
  revalidatePath("/portal");
  return { ok: true, emailed };
}

/* ============================================================
   REFERRALS
   ============================================================ */

/**
 * Records that one client introduced another, and thanks the referrer.
 *
 * Passing `null` clears the link — useful when it was attributed to the wrong
 * person, which happens.
 */
export async function setClientReferrer(
  clientId: string,
  referrerId: string | null,
  opts: { note?: string; thank?: boolean } = {}
) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(clientId);
  if (!id) throw new Error("Invalid client reference.");

  const referrer = referrerId ? asUuid(referrerId) : null;
  if (referrerId && !referrer) throw new Error("Invalid referrer reference.");
  // The database rejects this too, but a clear message beats a constraint error.
  if (referrer === id) throw new Error("A client cannot refer themselves.");

  await db.from("clients").update({
    referred_by_client_id: referrer,
    referral_note: opts.note?.trim() || null,
  }).eq("id", id);

  let thanked = false;
  if (referrer && opts.thank) {
    const [{ data: referrerRow }, { data: newClient }] = await Promise.all([
      db.from("clients").select("name, email").eq("id", referrer).maybeSingle(),
      db.from("clients").select("name, company").eq("id", id).maybeSingle(),
    ]);

    if (referrerRow?.email) {
      const res = await sendEmail({
        templateKey: "referral_thank_you",
        to: referrerRow.email,
        clientId: referrer,
        actorId: me.userId,
        vars: {
          client_name: referrerRow.name,
          referred_name: newClient?.company || newClient?.name || "someone",
          sender_name: me.fullName ?? "Nex Desk",
        },
      });
      thanked = res.ok;
    }
  }

  await recordAudit(
    me.userId,
    "client.referrer",
    "clients",
    id,
    { referred_by: referrer }
  );

  revalidatePath(`/${ADMIN}/clients/${id}`);
  if (referrer) revalidatePath(`/${ADMIN}/clients/${referrer}`);
  return { ok: true as const, thanked };
}

/* ============================================================
   ADDITIONAL SERVICES
   ============================================================ */

/**
 * Tells everyone a client has bought something else.
 *
 * `lockDeal` already raises the agreement, the project and the stage invoices —
 * this is the announcement that goes with it once a client is buying their
 * second or third service, summarising the whole relationship rather than just
 * the new line.
 */
export async function announceAdditionalService(dealId: string) {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(dealId);
  if (!id) throw new Error("Invalid deal reference.");

  const { data: deal } = await db
    .from("deals").select("*, clients(id, name, email)").eq("id", id).maybeSingle();
  if (!deal) throw new Error("Deal not found.");

  const client = (deal.clients as any) ?? null;
  if (!client?.email) throw new Error("This client has no email address on file.");

  // Everything they have bought so far, so the email states the real position
  // rather than only the newest line.
  const { data: allDeals } = await db
    .from("deals").select("title, total, currency, status").eq("client_id", deal.client_id);

  const locked = (allDeals ?? []).filter((d) => d.status === "locked");
  const sameCurrency = locked.filter(
    (d) => String(d.currency).toUpperCase() === String(deal.currency).toUpperCase()
  );
  const combined = sameCurrency.reduce((s, d) => s + Number(d.total || 0), 0);

  const res = await sendEmail({
    templateKey: "client_service_added",
    to: client.email,
    clientId: deal.client_id,
    actorId: me.userId,
    attach: { type: "agreement", id: deal.id },
    vars: {
      client_name: client.name,
      service_name: deal.title,
      amount: Number(deal.total).toLocaleString(),
      currency: deal.currency,
      service_count: locked.length,
      combined_total: `${deal.currency} ${combined.toLocaleString()}`,
      portal_url: `${getSiteBaseUrl()}/portal`,
      sender_name: me.fullName ?? "Nex Desk",
    },
  });

  await sendEmail({
    templateKey: "admin_service_added_notice",
    to: await adminNotifyAddress(),
    clientId: deal.client_id,
    actorId: me.userId,
    vars: {
      client_name: client.name,
      service_name: deal.title,
      amount: Number(deal.total).toLocaleString(),
      currency: deal.currency,
      service_count: locked.length,
      combined_total: `${deal.currency} ${combined.toLocaleString()}`,
      admin_url: `${getSiteBaseUrl()}/${ADMIN}/clients/${deal.client_id}`,
    },
  }).catch((e) => console.error("Service-added notice failed:", e));

  revalidatePath(`/${ADMIN}/clients/${deal.client_id}`);
  return { ok: res.ok, error: res.ok ? undefined : res.error, serviceCount: locked.length };
}
