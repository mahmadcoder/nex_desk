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
  language?: "en" | "ar" | "fr" | "de" | "es";
};

export async function sendEmail(args: SendArgs) {
  const db = createAdminClient();

  const lang = args.language ?? "en";
  const langKey = `${args.templateKey}_${lang}`;

  const { data: tpl } = await db.from("email_templates")
    .select("*").or(`key.eq.${args.templateKey},key.eq.${langKey}`).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
    newsletter_welcome: {
      subject: "Welcome to Nex Desk — Software Agency",
      body: "Hi {{client_name}},\n\nThank you for subscribing to the Nex Desk newsletter!\n\nWe share monthly insights on custom software engineering, modern web applications, UI/UX design trends, and tech strategy.\n\nWarm regards,\nThe Nex Desk Team",
    },
    employee_joining_en: {
      subject: "Welcome to Nex Desk — Employee Onboarding",
      body: "Hi {{employee_name}},\n\nWelcome aboard! We are thrilled to have you join Nex Desk as our new {{job_title}} ({{seniority}}).\n\nYour profile details:\n• Role: {{job_title}}\n• Seniority: {{seniority}}\n• Location: {{city}}, {{country}}\n• Joining Date: {{joining_date}}\n\nOur team is excited to work with you on upcoming client projects.\n\nWarm regards,\nThe Nex Desk Leadership Team",
    },
    employee_joining_ar: {
      subject: "مرحباً بك في نيكس ديسك — انضمام موظف جديد",
      body: "أهلاً بك {{employee_name}}،\n\nيسعدنا جداً انضمامك إلى فريق نيكس ديسك كـ {{job_title}} ({{seniority}}).\n\nتفاصيل الملف الشخصي:\n• المسمى الوظيفي: {{job_title}}\n• المستوى الوظيفي: {{seniority}}\n• الموقع: {{city}}، {{country}}\n• تاريخ البدء: {{joining_date}}\n\nفريقنا متحمس للعمل معك في مشاريع العملاء القادمة.\n\nمع أطيب التحيات،\nفريق إدارة نيكس ديسك",
    },
    employee_joining_fr: {
      subject: "Bienvenue chez Nex Desk — Intégration",
      body: "Bonjour {{employee_name}},\n\nBienvenue à bord ! Nous sommes ravis de vous accueillir chez Nex Desk au poste de {{job_title}} ({{seniority}}).\n\nDétails de votre profil :\n• Poste : {{job_title}}\n• Niveau : {{seniority}}\n• Ville : {{city}}, {{country}}\n• Date d'arrivée : {{joining_date}}\n\nCordialement,\nL'équipe dirigeante de Nex Desk",
    },
    employee_joining_de: {
      subject: "Willkommen bei Nex Desk — Onboarding",
      body: "Hallo {{employee_name}},\n\nWillkommen an Bord! Wir freuen uns sehr, Sie als neuen {{job_title}} ({{seniority}}) bei Nex Desk zu begrüßen.\n\nIhre Profildetails:\n• Rolle: {{job_title}}\n• Erfahrenheit: {{seniority}}\n• Standort: {{city}}, {{country}}\n• Startdatum: {{joining_date}}\n\nMit freundlichen Grüßen,\nDas Nex Desk Management Team",
    },
    employee_joining_es: {
      subject: "Bienvenido a Nex Desk — Incorporación",
      body: "Hola {{employee_name}},\n\n¡Bienvenido al equipo! Estamos encantados de que te unas a Nex Desk como nuestro nuevo {{job_title}} ({{seniority}}).\n\nDetalles del perfil:\n• Rol: {{job_title}}\n• Nivel: {{seniority}}\n• Ubicación: {{city}}, {{country}}\n• Fecha de ingreso: {{joining_date}}\n\nSaludos cordiales,\nEl equipo directivo de Nex Desk",
    },
  };

  const fallback = DEFAULT_TEMPLATES[langKey] ?? DEFAULT_TEMPLATES[args.templateKey];
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
      html: renderHtml(subject, body, lang),
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

/** Plain, readable HTML that survives Gmail, Outlook and Apple Mail with RTL support for Arabic. */
function renderHtml(subject: string, body: string, lang: string = "en") {
  const isRtl = lang === "ar";
  const dirAttr = isRtl ? 'dir="rtl"' : 'dir="ltr"';
  const alignStyle = isRtl ? 'text-align:right' : 'text-align:left';

  const paragraphs = body
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 16px;white-space:pre-line;${alignStyle}">${escapeHtml(p)}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html ${dirAttr}><body style="margin:0;padding:0;background:#F4F1EA;${alignStyle}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA;padding:32px 16px" ${dirAttr}>
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E4E0D4;border-radius:12px;overflow:hidden;${alignStyle}" ${dirAttr}>
    <tr><td style="background:#0B0B0F;padding:20px 28px;${alignStyle}">
      <span style="color:#F4F1EA;font:500 17px/1 -apple-system,Segoe UI,Inter,sans-serif;letter-spacing:-.4px">Nex</span><span style="color:#8A877F;font:500 17px/1 -apple-system,Segoe UI,Inter,sans-serif;letter-spacing:-.4px">Desk</span>
      <span style="float:${isRtl ? 'left' : 'right'};color:#D0FF4E;font:400 11px/1.6 ui-monospace,monospace;letter-spacing:1.5px;text-transform:uppercase">software agency</span>
    </td></tr>
    <tr><td style="padding:32px 28px;color:#1B1B22;font:400 15px/1.65 -apple-system,Segoe UI,Inter,sans-serif;${alignStyle}">
      <h1 style="margin:0 0 20px;font-size:20px;font-weight:500;letter-spacing:-.3px;color:#0B0B0F;${alignStyle}">${escapeHtml(subject)}</h1>
      ${paragraphs}
    </td></tr>
    <tr><td style="padding:18px 28px;border-top:1px solid #E4E0D4;color:#75736C;font:400 12px/1.6 -apple-system,Segoe UI,Inter,sans-serif;${alignStyle}">
      Nex Desk · <a href="mailto:ahmadsadiq.dev@gmail.com" style="color:#75736C">ahmadsadiq.dev@gmail.com</a> ·
      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "#"}" style="color:#75736C">nexdesk.agency</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
