import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/server";
import { fillTemplate, pdfFilename, CONTACT_WHATSAPP } from "@/lib/utils";
import { generateDocument, type DocType } from "@/lib/pdf/generate";
import { renderHtml } from "./layout";
import { EMAIL_TEMPLATES } from "./templates";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});


/** Last-resort recipient if neither the settings row nor the env var is set. */
const FALLBACK_ADMIN_EMAIL = "ahmadsadiq.dev@gmail.com";

/**
 * The single address every internal notification goes to.
 *
 * Previously each call site picked its own source — some read `settings.email`
 * (seeded to hello@nexdesk.com), others read `GMAIL_USER` — so notifications
 * scattered across two different inboxes. Resolve it here, once.
 */
export async function adminNotifyAddress(): Promise<string> {
  try {
    const { data } = await createAdminClient()
      .from("settings").select("email").eq("id", 1).maybeSingle();
    const configured = data?.email?.trim();
    if (configured) return configured;
  } catch (e) {
    console.error("Could not read settings.email, falling back:", e);
  }
  return process.env.ADMIN_EMAIL?.trim() || process.env.GMAIL_USER?.trim() || FALLBACK_ADMIN_EMAIL;
}

/**
 * Tells someone their sign-in address changed — sent to BOTH the old and the
 * new address, so a typo in the new one is still recoverable at the old one.
 */
export async function notifyEmailChange(args: {
  name: string;
  oldEmail?: string | null;
  newEmail: string;
  loginUrl: string;
  actorId?: string;
}) {
  const body =
    `Hi ${args.name},\n\n` +
    `The email address you use to sign in has been updated.\n\n` +
    `• Previous address: ${args.oldEmail || "—"}\n` +
    `• New sign-in address: ${args.newEmail}\n` +
    `• Sign in here: ${args.loginUrl}\n\n` +
    `Your password has not changed. From now on, sign in with the new address above.\n\n` +
    `If you did not expect this change, reply to this email straight away.\n\n` +
    `Nex Desk`;

  const recipients = Array.from(
    new Set([args.newEmail, args.oldEmail].filter((e): e is string => !!e))
  );

  const results = await Promise.allSettled(
    recipients.map((to) =>
      sendEmail({
        templateKey: "account_email_changed",
        to,
        actorId: args.actorId,
        vars: { name: args.name, new_email: args.newEmail, login_url: args.loginUrl },
        subjectOverride: "Your Nex Desk sign-in email has changed",
        bodyOverride: body,
      })
    )
  );

  const failure = results.find((r) => r.status === "rejected" || !r.value?.ok);
  if (!failure) return { ok: true as const };
  return {
    ok: false as const,
    error:
      failure.status === "rejected"
        ? String(failure.reason)
        : failure.value?.error ?? "Notification email failed.",
  };
}

export type SendArgs = {
  templateKey: string;
  to: string;
  vars: Record<string, string | number>;
  /** Attach a freshly generated PDF of this type for this record id. */
  attach?: { type: DocType; id: string };
  /**
   * Attach a buffer the caller already rendered. For documents that have no
   * row in `documents` — the staff offer letter, which belongs to an employee
   * rather than a client and so does not fit that table.
   */
  rawAttachments?: { filename: string; content: Buffer }[];
  clientId?: string;
  projectId?: string;
  cc?: string[];
  actorId?: string;
  /** Override the stored template body, e.g. after editing it in the send screen. */
  bodyOverride?: string;
  subjectOverride?: string;
  language?: "en" | "ar" | "fr" | "de" | "es";
};

export async function sendEmail(args: SendArgs) {
  const db = createAdminClient();

  const lang = args.language ?? "en";
  const langKey = `${args.templateKey}_${lang}`;

  const { data: tpl } = await db.from("email_templates")
    .select("*").or(`key.eq.${args.templateKey},key.eq.${langKey}`).order("created_at", { ascending: false }).limit(1).maybeSingle();

  // Resolution order: explicit override → admin's edited DB row → the copy
  // shipped in code. The code entry is the safety net, so an unseeded database
  // can never produce a blank email.
  const fallback = EMAIL_TEMPLATES[langKey] ?? EMAIL_TEMPLATES[args.templateKey];
  const subjectRaw = args.subjectOverride ?? tpl?.subject ?? fallback?.subject;
  const bodyRaw = args.bodyOverride ?? tpl?.body ?? fallback?.body;

  // Refuse to send an empty shell. Sending "A message from Nex Desk" with no
  // content to a prospective client is worse than sending nothing, and it hides
  // the real problem (a template key with no copy behind it).
  if (!bodyRaw?.trim() || !subjectRaw?.trim()) {
    const message = `No email copy found for template "${args.templateKey}". Nothing sent.`;
    console.error(message);
    await db.from("email_log").insert({
      template_key: args.templateKey,
      to_email: args.to,
      subject: subjectRaw ?? "(missing)",
      body_preview: "(missing template)",
      client_id: args.clientId ?? null,
      project_id: args.projectId ?? null,
      sent_by: args.actorId ?? null,
      status: "failed",
      error: message,
    });
    return { ok: false as const, error: message };
  }

  // `whatsapp` is available to every template without each call site passing
  // it — clients send receipts and signed pages there far more often than by
  // email, so any template may want to offer the route.
  const vars = {
    company_name: "Nex Desk",
    sender_name: "Nex Desk",
    whatsapp: CONTACT_WHATSAPP,
    ...args.vars,
  };
  const subject = fillTemplate(subjectRaw, vars);
  const body = fillTemplate(bodyRaw, vars);

  const attachments: { filename: string; content: Buffer }[] = [];
  let documentId: string | null = null;

  if (args.attach) {
    const doc = await generateDocument(args.attach.type, args.attach.id, args.actorId);
    documentId = doc.document?.id ?? null;
    // Same naming rule as the download link, so the attachment a client saves
    // and the file they download from the portal match.
    attachments.push({ filename: pdfFilename(doc.title), content: doc.buffer });
  }

  if (args.rawAttachments?.length) attachments.push(...args.rawAttachments);

  const log = {
    template_key: args.templateKey,
    to_email: args.to,
    cc: args.cc ?? null,
    subject,
    body_preview: body.slice(0, 300),
    client_id: args.clientId ?? null,
    project_id: args.projectId ?? null,
    document_id: documentId,
    sent_by: args.actorId ?? null,
  };

  const fromLabel = process.env.GMAIL_FROM_LABEL ?? "Nex Desk";
  const fromAddress = process.env.GMAIL_USER ?? "";

  try {
    const info = await transporter.sendMail({
      from: `"${fromLabel}" <${fromAddress}>`,
      to: args.to,
      cc: args.cc?.join(", "),
      subject,
      html: renderHtml(subject, body, lang),
      text: body,
      attachments: attachments.length
        ? attachments.map((a) => ({ filename: a.filename, content: a.content }))
        : undefined,
    });

    await db.from("email_log").insert({ ...log, status: "sent", provider_id: info.messageId });
    return { ok: true as const, id: info.messageId };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    await db.from("email_log").insert({ ...log, status: "failed", error: message });
    return { ok: false as const, error: message };
  }
}
