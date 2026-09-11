"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/auth/guards";
import { asUuid } from "@/lib/utils";
import { recordAudit } from "@/lib/actions/audit";
import { aiComplete } from "@/lib/ai";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN = process.env.ADMIN_PATH || "nx-control";

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type LeadPriority = (typeof PRIORITIES)[number];

/**
 * Lead triage.
 *
 * `leads.priority`, `leads.assigned_to` and `leads.notes` have existed in the
 * schema since launch with no UI behind any of them, so every enquiry has
 * looked exactly as important as every other one.
 *
 * Speed to first response is the strongest single predictor of winning a lead,
 * and the slow part is never the typing — it is reading a rambling form
 * submission and deciding what it is worth. That is what this does.
 */

/** A plain field label, not JSON: models get key names right far more often than they get brackets right. */
function parseSection(text: string, label: string): string {
  const re = new RegExp(`^\\s*${label}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:PRIORITY|SUMMARY|NEXT_STEP|REPLY)\\s*:|$)`, "im");
  return text.match(re)?.[1]?.trim() ?? "";
}

export async function triageLead(
  leadId: string
): Promise<Result<{ summary: string; priority: LeadPriority; reply: string; nextStep?: string }>> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(leadId);
  if (!id) return { ok: false, error: "Invalid lead reference." };

  const { data: lead } = await db.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) return { ok: false, error: "That lead no longer exists." };

  const res = await aiComplete(
    `You are the Senior Client Solutions and Intake Director at Nex Desk, a premier digital agency building high-performance web applications, mobile apps, and custom software.\n\n` +
      `Review the incoming client enquiry below with commercial sharpness, professionalism, and constructive sales intelligence. Reply in EXACTLY this shape, with these four labels, nothing before or after:\n\n` +
      `PRIORITY: one of low, normal, high, urgent\n` +
      `SUMMARY: 1-2 concise, executive sentences summarizing what the client wants to build, their requirements, and estimated project scope. Focus on the business opportunity and be constructive (do not dismiss or criticize client inputs).\n` +
      `NEXT_STEP: one specific, actionable recommendation for our team (e.g. schedule a 15-min discovery call, send questionnaire, or prepare tailored architecture options).\n` +
      `REPLY: a warm, professional, high-converting first reply to the client.\n\n` +
      `How to judge priority:\n` +
      `• urgent — explicit budget or package mentioned, immediate timeline (e.g. 2–4 weeks), or ready to kick off\n` +
      `• high — genuine project inquiry with defined scope, package, or timeline\n` +
      `• normal — general exploration or early discovery inquiry\n` +
      `• low — non-client solicitation, vendor pitching, recruitment or spam\n\n` +
      `The reply:\n` +
      `- Warm, confident, and professional.\n` +
      `- Specifically acknowledge their requested service, package, and project goals.\n` +
      `- Express excitement to help them execute it on schedule.\n` +
      `- Ask 1 or 2 high-impact qualifying questions (e.g. target platforms, design readiness, or must-have features).\n` +
      `- Offer a quick 15-minute intro call to align on scope and deliver a formal quote.\n` +
      `- Keep length under 140 words.\n` +
      `- End with "Best regards,\nNex Desk Team".\n\n` +
      `--- ENQUIRY ---\n` +
      `name: ${lead.name}\n` +
      `email: ${lead.email}\n` +
      `company: ${lead.company || "—"}\n` +
      `country: ${lead.country || "—"}\n` +
      `interested in: ${(lead.service_slugs ?? []).join(", ") || "not stated"}\n` +
      `budget: ${lead.budget_range || "not stated"}\n` +
      `timeline: ${lead.timeline || "not stated"}\n` +
      `source: ${lead.source || "website"}\n` +
      `message: ${String(lead.message || "(they left the message blank)").slice(0, 3000)}`
  );

  if (!res.ok) return { ok: false, error: res.error };

  const rawPriority = parseSection(res.text, "PRIORITY").toLowerCase().replace(/[^a-z]/g, "");
  const priority = (PRIORITIES as readonly string[]).includes(rawPriority)
    ? (rawPriority as LeadPriority)
    : "normal";

  const summary = parseSection(res.text, "SUMMARY");
  const nextStep = parseSection(res.text, "NEXT_STEP");
  const reply = parseSection(res.text, "REPLY");

  // A model that ignored the format would otherwise overwrite a real note with
  // nothing. Better to report the miss than to save an empty triage.
  if (!summary && !reply) {
    return { ok: false, error: "The AI did not answer in a usable format. Try again." };
  }

  // Saved so the assessment survives a refresh and shows on the row. The
  // existing note is kept — a human's note outranks a generated one.
  const fullNote = summary
    ? `AI triage: ${summary}${nextStep ? ` • Next: ${nextStep}` : ""}`
    : lead.notes;

  await db.from("leads").update({
    priority,
    notes: lead.notes?.trim() && !lead.notes.startsWith("AI triage:")
      ? lead.notes
      : fullNote,
  }).eq("id", id);

  await recordAudit(me.userId, "lead.triage", "leads", id, { priority });

  revalidatePath(`/${ADMIN}/leads`);
  return { ok: true, summary, priority, reply, nextStep };
}

/** Set by hand. The AI's guess is a suggestion, never the last word. */
export async function setLeadPriority(
  leadId: string,
  priority: LeadPriority
): Promise<Result> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(leadId);
  if (!id) return { ok: false, error: "Invalid lead reference." };
  if (!(PRIORITIES as readonly string[]).includes(priority)) {
    return { ok: false, error: "Unknown priority." };
  }

  const { error } = await db.from("leads").update({ priority }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await recordAudit(me.userId, "lead.priority", "leads", id, { priority });
  revalidatePath(`/${ADMIN}/leads`);
  return { ok: true };
}

/** Free-text note on a lead — what was said on the call, why it stalled. */
export async function saveLeadNote(leadId: string, notes: string): Promise<Result> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(leadId);
  if (!id) return { ok: false, error: "Invalid lead reference." };

  const { error } = await db.from("leads").update({ notes: notes.trim() || null }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await recordAudit(me.userId, "lead.note", "leads", id, {});
  revalidatePath(`/${ADMIN}/leads`);
  return { ok: true };
}
