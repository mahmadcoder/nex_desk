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
  const re = new RegExp(`^\\s*${label}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:PRIORITY|SUMMARY|REPLY)\\s*:|$)`, "im");
  return text.match(re)?.[1]?.trim() ?? "";
}

export async function triageLead(
  leadId: string
): Promise<Result<{ summary: string; priority: LeadPriority; reply: string }>> {
  const me = await requireOwnerAdmin();
  const db = createAdminClient();

  const id = asUuid(leadId);
  if (!id) return { ok: false, error: "Invalid lead reference." };

  const { data: lead } = await db.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) return { ok: false, error: "That lead no longer exists." };

  const res = await aiComplete(
    `You are the person who reads incoming enquiries at Nex Desk, a software agency ` +
      `building websites, web apps and mobile apps.\n\n` +
      `Read the enquiry below and reply in EXACTLY this shape, with these three labels, ` +
      `nothing before or after:\n\n` +
      `PRIORITY: one of low, normal, high, urgent\n` +
      `SUMMARY: one sentence, maximum 25 words, saying what they want and whether it looks real\n` +
      `REPLY: a short first reply to send them\n\n` +
      `How to judge priority. Be honest rather than optimistic — marking everything ` +
      `urgent is the same as marking nothing urgent:\n` +
      `• urgent — a clear budget, a named deadline, and a specific requirement\n` +
      `• high — a real project with either a budget or a timeline attached\n` +
      `• normal — a genuine enquiry that is still vague\n` +
      `• low — window shopping, a job application, an agency pitching to us, or spam\n\n` +
      `The reply: plain confident English, British spelling, no buzzwords, no exclamation ` +
      `marks, no emoji. Under 120 words. Answer what they actually asked, and ask at most ` +
      `two questions that would let us quote properly. Do not invent prices, timelines or ` +
      `capabilities. End with "Best regards" and no name.\n\n` +
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
  const reply = parseSection(res.text, "REPLY");

  // A model that ignored the format would otherwise overwrite a real note with
  // nothing. Better to report the miss than to save an empty triage.
  if (!summary && !reply) {
    return { ok: false, error: "The AI did not answer in a usable format. Try again." };
  }

  // Saved so the assessment survives a refresh and shows on the row. The
  // existing note is kept — a human's note outranks a generated one.
  await db.from("leads").update({
    priority,
    notes: lead.notes?.trim()
      ? lead.notes
      : summary
        ? `AI triage: ${summary}`
        : lead.notes,
  }).eq("id", id);

  await recordAudit(me.userId, "lead.triage", "leads", id, { priority });

  revalidatePath(`/${ADMIN}/leads`);
  return { ok: true, summary, priority, reply };
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
