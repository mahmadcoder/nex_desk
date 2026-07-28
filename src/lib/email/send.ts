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

import { getSiteBaseUrl } from "@/lib/utils";

/** Ultra-premium HTML email layout with dark glassmorphism, responsive CTA buttons, and executive typography. */
function renderHtml(subject: string, body: string, lang: string = "en") {
  const isRtl = lang === "ar";
  const dirAttr = isRtl ? 'dir="rtl"' : 'dir="ltr"';
  const alignStyle = isRtl ? 'text-align:right' : 'text-align:left';
  const siteUrl = getSiteBaseUrl();

  // Process body into structured HTML cards, paragraphs, and CTA buttons
  const paragraphs = body
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      // Check if block contains key-value bullets like "• Email: ..."
      if (trimmed.includes("• ") || trimmed.startsWith("- ")) {
        const items = trimmed
          .split("\n")
          .map((line) => {
            const cleanLine = line.replace(/^[•\-]\s*/, "").trim();
            if (cleanLine.includes("http://") || cleanLine.includes("https://")) {
              const urlMatch = cleanLine.match(/(https?:\/\/[^\s]+)/);
              if (urlMatch) {
                const url = urlMatch[0];
                const label = cleanLine.split(":")[0]?.trim() || "Access Link";
                return `<div style="margin-bottom:12px;"><span style="color:#A09E96;font-size:12px;display:block;margin-bottom:4px;font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;">${escapeHtml(label)}:</span><a href="${url}" target="_blank" style="display:inline-block;background:#D0FF4E;color:#09090D;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;">Access Portal Dashboard &rarr;</a></div>`;
              }
            }
            if (cleanLine.includes(":")) {
              const parts = cleanLine.split(":");
              const key = parts[0].trim();
              const val = parts.slice(1).join(":").trim();
              return `<div style="margin-bottom:8px;"><span style="color:#8A877F;font-size:12px;display:inline-block;min-width:110px;">${escapeHtml(key)}:</span><strong style="color:#F4F1EA;font-size:13px;font-family:ui-monospace,monospace;">${escapeHtml(val)}</strong></div>`;
            }
            return `<div style="margin-bottom:6px;color:#D0FF4E;font-size:13px;">&bull; ${escapeHtml(cleanLine)}</div>`;
          })
          .join("");

        return `<div style="background:#13131A;border:1px solid #242432;border-radius:10px;padding:18px 20px;margin:20px 0;${alignStyle}">${items}</div>`;
      }

      // Check if block contains standalone URL link
      if ((trimmed.includes("http://") || trimmed.includes("https://")) && !trimmed.includes("<a")) {
        const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          const url = urlMatch[0];
          const textBefore = trimmed.replace(url, "").trim();
          return `${textBefore ? `<p style="margin:0 0 14px;white-space:pre-line;color:#D4D0C5;font-size:14px;line-height:1.6;${alignStyle}">${escapeHtml(textBefore)}</p>` : ""}<div style="margin:20px 0;${alignStyle}"><a href="${url}" target="_blank" style="display:inline-block;background:#D0FF4E;color:#09090D;font-weight:700;padding:13px 28px;border-radius:8px;text-decoration:none;font-size:14px;letter-spacing:-0.2px;box-shadow:0 4px 16px rgba(208,255,78,0.25);">Click Here to Continue &rarr;</a></div>`;
        }
      }

      return `<p style="margin:0 0 16px;white-space:pre-line;color:#D4D0C5;font-size:14px;line-height:1.65;${alignStyle}">${escapeHtml(trimmed)}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html ${dirAttr}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#09090D;color:#F4F1EA;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,sans-serif;${alignStyle}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090D;padding:40px 16px;" ${dirAttr}>
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#0F0F16;border:1px solid #1E1E2C;border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);${alignStyle}" ${dirAttr}>
          
          <!-- Executive Brand Header -->
          <tr>
            <td style="background:#09090D;padding:24px 32px;border-bottom:1px solid #1E1E2C;${alignStyle}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="${isRtl ? "right" : "left"}">
                    <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;">
                      Nex<span style="color:#D0FF4E;">Desk</span>
                    </span>
                  </td>
                  <td align="${isRtl ? "left" : "right"}">
                    <span style="background:rgba(208,255,78,0.12);color:#D0FF4E;border:1px solid rgba(208,255,78,0.25);font-size:10px;font-weight:700;padding:5px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:1.2px;font-family:ui-monospace,monospace;">
                      SOFTWARE AGENCY
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Email Content Body -->
          <tr>
            <td style="padding:36px 32px;${alignStyle}">
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;letter-spacing:-0.4px;color:#FFFFFF;line-height:1.3;${alignStyle}">
                ${escapeHtml(subject)}
              </h1>
              ${paragraphs}
            </td>
          </tr>

          <!-- Sleek Agency Footer -->
          <tr>
            <td style="padding:22px 32px;background:#09090D;border-top:1px solid #1E1E2C;color:#75736C;font-size:12px;line-height:1.6;${alignStyle}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="${isRtl ? "right" : "left"}" style="color:#8A877F;">
                    &copy; ${new Date().getFullYear()} Nex Desk Software Agency. All rights reserved.
                  </td>
                  <td align="${isRtl ? "left" : "right"}">
                    <a href="${siteUrl}" target="_blank" style="color:#D0FF4E;text-decoration:none;font-weight:600;">nexdesk.agency &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
