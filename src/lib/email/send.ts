import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/server";
import { fillTemplate } from "@/lib/utils";
import { generateDocument, type DocType } from "@/lib/pdf/generate";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});


export type SendArgs = {
  templateKey: string;
  to: string;
  vars: Record<string, string | number>;
  /** Attach a freshly generated PDF of this type for this record id. */
  attach?: { type: DocType; id: string };
  clientId?: string;
  projectId?: string;
  cc?: string[];
  actorId?: string;
  /** Override the stored template body, e.g. after editing it in the send screen. */
  bodyOverride?: string;
  subjectOverride?: string;
};

export async function sendEmail(args: SendArgs) {
  const db = createAdminClient();

  const { data: tpl } = await db.from("email_templates")
    .select("*").eq("key", args.templateKey).single();

  const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
    newsletter_welcome: {
      subject: "Welcome to Nex Desk — Software Agency",
      body: "Hi {{client_name}},\n\nThank you for subscribing to the Nex Desk newsletter!\n\nWe share monthly insights on custom software engineering, modern web applications, UI/UX design trends, and tech strategy.\n\nExplore our latest case studies and agency work at {{portal_url}}/work.\n\nWarm regards,\nThe Nex Desk Team",
    },
  };

  const fallback = DEFAULT_TEMPLATES[args.templateKey];
  const subjectRaw = args.subjectOverride ?? tpl?.subject ?? fallback?.subject ?? "A message from Nex Desk";
  const bodyRaw = args.bodyOverride ?? tpl?.body ?? fallback?.body ?? "";

  const vars = { company_name: "Nex Desk", sender_name: "Nex Desk", ...args.vars };
  const subject = fillTemplate(subjectRaw, vars);
  const body = fillTemplate(bodyRaw, vars);

  let attachments: { filename: string; content: Buffer }[] | undefined;
  let documentId: string | null = null;

  if (args.attach) {
    const doc = await generateDocument(args.attach.type, args.attach.id, args.actorId);
    documentId = doc.document?.id ?? null;
    attachments = [{
      filename: `${doc.title.replace(/[^\w\s-]/g, "").slice(0, 60)}.pdf`,
      content: doc.buffer,
    }];
  }

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
      html: renderHtml(subject, body),
      text: body,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    await db.from("email_log").insert({ ...log, status: "sent", provider_id: info.messageId });
    return { ok: true as const, id: info.messageId };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    await db.from("email_log").insert({ ...log, status: "failed", error: message });
    return { ok: false as const, error: message };
  }
}

/** Plain, readable HTML that survives Gmail, Outlook and Apple Mail. */
function renderHtml(subject: string, body: string) {
  const paragraphs = body
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 16px;white-space:pre-line">${escapeHtml(p)}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F4F1EA">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA;padding:32px 16px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E4E0D4;border-radius:12px;overflow:hidden">
    <tr><td style="background:#0B0B0F;padding:20px 28px">
      <span style="color:#F4F1EA;font:500 17px/1 -apple-system,Segoe UI,Inter,sans-serif;letter-spacing:-.4px">Nex</span><span style="color:#8A877F;font:500 17px/1 -apple-system,Segoe UI,Inter,sans-serif;letter-spacing:-.4px">Desk</span>
      <span style="float:right;color:#D0FF4E;font:400 11px/1.6 ui-monospace,monospace;letter-spacing:1.5px;text-transform:uppercase">software agency</span>
    </td></tr>
    <tr><td style="padding:32px 28px;color:#1B1B22;font:400 15px/1.65 -apple-system,Segoe UI,Inter,sans-serif">
      <h1 style="margin:0 0 20px;font-size:20px;font-weight:500;letter-spacing:-.3px;color:#0B0B0F">${escapeHtml(subject)}</h1>
      ${paragraphs}
    </td></tr>
    <tr><td style="padding:18px 28px;border-top:1px solid #E4E0D4;color:#75736C;font:400 12px/1.6 -apple-system,Segoe UI,Inter,sans-serif">
      Nex Desk · <a href="mailto:ahmadsadiq.dev@gmail.com" style="color:#75736C">ahmadsadiq.dev@gmail.com</a> ·
      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "#"}" style="color:#75736C">nexdesk.agency</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
