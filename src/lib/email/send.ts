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

    /* ── Client Welcome (Merike Step 2) ── */
    client_welcome: {
      subject: "Welcome to Nex Desk — Here's What Happens Next",
      body: `Hi {{client_name}},

Welcome aboard — we're genuinely excited to be working with you.

Here's exactly what the next few days look like:

• Step 1: We'll send you a short client intake form to gather your project details, brand files, and any references you'd like us to follow. Takes about 5 minutes.

• Step 2: Within 48 hours of receiving your completed form, we'll send you a detailed project outline with timeline and milestone breakdown.

• Step 3: Work officially begins on the agreed start date. You'll receive a staging link where you can watch progress in real time.

A few things worth knowing:

• Working Hours: Monday – Saturday, 10am – 7pm PKT
• Response Time: We reply to all messages within one working day
• Best Way to Reach Us: Email (hello@nexdesk.com) or WhatsApp
• Revisions: Your agreement includes 2 full rounds of revisions per deliverable

If you have any questions before we start, reply to this email directly — a real person reads every message.

Looking forward to building something great together.

Warm regards,
Ahmad Sadiq
Nex Desk Software Agency`,
    },

    /* ── Payment Thank You (Merike Step 5) ── */
    payment_thankyou: {
      subject: "Payment Received — Thank You, {{client_name}}",
      body: `Hi {{client_name}},

Payment received — thank you!

We're officially moving forward. Here's what happens next:

• Your project is now active in our pipeline
• You'll receive your first progress update within the next few working days
• Your Client Portal is live — you can track milestones, view documents, and check project status at any time

We appreciate your trust in Nex Desk. If you need anything at all, just reply to this email.

— Ahmad Sadiq
Nex Desk Software Agency

P.S. As a token of appreciation, your next project with us gets 10% off. Just mention this email when you're ready.`,
    },

    /* ── Portal Introduction (Merike Step 4) ── */
    portal_intro: {
      subject: "Your Nex Desk Client Portal Is Ready",
      body: `Hi {{client_name}},

Your dedicated Client Portal is now set up and ready to use.

Here's what you can do inside:

• Track Project Progress — See real-time milestones, percentage complete, and delivery dates
• View Invoices & Payments — Complete financial history with download options
• Access Documents — Agreements, receipts, progress reports, and handover documents
• Meet Your Team — See the dedicated agency team assigned to your project
• Upload Files — Share brand assets, content, or signed documents directly

We update the portal every 2-3 business days as work progresses.

Your login credentials:
• Email: {{client_email}}
• Portal: {{portal_url}}

If this is your first time logging in, click the portal link above and use the "Reset Password" option to set your password.

Any questions? Just reply to this email.

Warm regards,
Nex Desk Team`,
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

/**
 * Premium HTML email layout — deep navy glassmorphism design
 * with official NexDesk branding, refined typography, and structured content blocks.
 */
function renderHtml(subject: string, body: string, lang: string = "en") {
  const isRtl = lang === "ar";
  const dirAttr = isRtl ? 'dir="rtl"' : 'dir="ltr"';
  const alignStyle = isRtl ? 'text-align:right' : 'text-align:left';
  const siteUrl = getSiteBaseUrl();

  /* ── Brand palette tokens ── */
  const C = {
    pageBg:   "#070A10",
    cardBg:   "#0E1320",
    cardBorder: "#1A2236",
    headerBg: "#0A0E17",
    lime:     "#D0FF4E",
    limeDark: "#2A3A00",
    text:     "#F1F5F9",
    textSub:  "#CBD5E1",
    textMuted:"#8492A6",
    divider:  "#1A2236",
    infoBg:   "#111827",
    infoBorder:"#243049",
  };

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
                return `<div style="margin-bottom:14px;"><span style="color:${C.textMuted};font-size:12px;display:block;margin-bottom:6px;font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;">${escapeHtml(label)}:</span><a href="${url}" target="_blank" style="display:inline-block;background:${C.lime};color:${C.limeDark};font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;box-shadow:0 4px 16px rgba(208,255,78,0.2);">Access Portal Dashboard &rarr;</a></div>`;
              }
            }
            if (cleanLine.includes(":")) {
              const parts = cleanLine.split(":");
              const key = parts[0].trim();
              const val = parts.slice(1).join(":").trim();
              return `<div style="margin-bottom:10px;"><span style="color:${C.textMuted};font-size:12px;display:inline-block;min-width:120px;font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;">${escapeHtml(key)}:</span><strong style="color:${C.text};font-size:13px;font-family:ui-monospace,monospace;">${escapeHtml(val)}</strong></div>`;
            }
            return `<div style="margin-bottom:8px;padding-left:16px;position:relative;"><span style="position:absolute;left:0;color:${C.lime};font-size:14px;line-height:1;">•</span><span style="color:${C.textSub};font-size:13px;line-height:1.5;">${escapeHtml(cleanLine)}</span></div>`;
          })
          .join("");

        return `<div style="background:${C.infoBg};border:1px solid ${C.infoBorder};border-radius:12px;padding:20px 22px;margin:20px 0;${alignStyle}">${items}</div>`;
      }

      // Check if block contains standalone URL link
      if ((trimmed.includes("http://") || trimmed.includes("https://")) && !trimmed.includes("<a")) {
        const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          const url = urlMatch[0];
          const textBefore = trimmed.replace(url, "").trim();
          return `${textBefore ? `<p style="margin:0 0 14px;white-space:pre-line;color:${C.textSub};font-size:14px;line-height:1.65;${alignStyle}">${escapeHtml(textBefore)}</p>` : ""}<div style="margin:22px 0;${alignStyle}"><a href="${url}" target="_blank" style="display:inline-block;background:${C.lime};color:${C.limeDark};font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:14px;letter-spacing:-0.2px;box-shadow:0 4px 20px rgba(208,255,78,0.2);font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;">Open Link &rarr;</a></div>`;
        }
      }

      return `<p style="margin:0 0 16px;white-space:pre-line;color:${C.textSub};font-size:14px;line-height:1.7;${alignStyle}">${escapeHtml(trimmed)}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html ${dirAttr}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.pageBg};color:${C.text};font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,sans-serif;${alignStyle}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.pageBg};padding:48px 16px;" ${dirAttr}>
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.cardBg};border:1px solid ${C.cardBorder};border-radius:20px;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.5),0 0 0 1px rgba(26,34,54,0.5);${alignStyle}" ${dirAttr}>
          
          <!-- ── Brand Header ── -->
          <tr>
            <td style="background:${C.headerBg};padding:28px 36px;border-bottom:1px solid ${C.divider};${alignStyle}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="${isRtl ? "right" : "left"}" valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle" style="padding-right:10px;">
                          <!-- Logo Mark: desk + caret -->
                          <div style="width:32px;height:32px;background:linear-gradient(135deg,#111827,#0A0E17);border-radius:8px;display:inline-block;position:relative;vertical-align:middle;">
                            <div style="position:absolute;bottom:7px;left:5px;width:22px;height:3px;background:#F1F5F9;border-radius:2px;opacity:0.9;"></div>
                            <div style="position:absolute;top:5px;left:9px;width:14px;height:14px;background:#D0FF4E;border-radius:3px;"></div>
                          </div>
                        </td>
                        <td valign="middle">
                          <span style="font-size:20px;font-weight:700;letter-spacing:-0.5px;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;">
                            Nex<span style="color:#F1F5F9;"> Desk</span><span style="display:inline-block;width:4px;height:17px;background:#D0FF4E;border-radius:1px;margin-left:2px;vertical-align:baseline;transform:translateY(2px);"></span>
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="${isRtl ? "left" : "right"}" valign="middle">
                    <span style="background:rgba(208,255,78,0.1);color:${C.lime};border:1px solid rgba(208,255,78,0.2);font-size:10px;font-weight:700;padding:6px 14px;border-radius:20px;text-transform:uppercase;letter-spacing:1.2px;font-family:ui-monospace,monospace;">
                      SOFTWARE AGENCY
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Accent line under header ── -->
          <tr>
            <td style="height:2px;background:linear-gradient(90deg,transparent,rgba(208,255,78,0.3),transparent);"></td>
          </tr>

          <!-- ── Main Email Content ── -->
          <tr>
            <td style="padding:40px 36px 32px;${alignStyle}">
              <h1 style="margin:0 0 28px;font-size:24px;font-weight:700;letter-spacing:-0.4px;color:#FFFFFF;line-height:1.3;${alignStyle}">
                ${escapeHtml(subject)}
              </h1>
              ${paragraphs}
            </td>
          </tr>

          <!-- ── Footer Divider ── -->
          <tr>
            <td style="padding:0 36px;"><div style="height:1px;background:${C.divider};"></div></td>
          </tr>

          <!-- ── Agency Footer ── -->
          <tr>
            <td style="padding:24px 36px 28px;${alignStyle}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="${isRtl ? "right" : "left"}" style="color:${C.textMuted};font-size:12px;line-height:1.6;">
                    <p style="margin:0 0 4px;">&copy; ${new Date().getFullYear()} Nex Desk Software Agency</p>
                    <p style="margin:0;color:${C.textMuted};font-size:11px;">Multan, Pakistan &middot; Working worldwide across timezones</p>
                  </td>
                  <td align="${isRtl ? "left" : "right"}" valign="top">
                    <a href="${siteUrl}" target="_blank" style="display:inline-block;color:${C.lime};text-decoration:none;font-weight:600;font-size:12px;padding:6px 14px;border:1px solid rgba(208,255,78,0.2);border-radius:8px;transition:all 0.2s;">nexdesk.agency &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- ── Tiny unsubscribe / legal line below the card ── -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin-top:16px;">
          <tr>
            <td align="center" style="color:#4A5568;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;">
              This email was sent by Nex Desk Software Agency &middot; <a href="mailto:hello@nexdesk.com" style="color:#8492A6;text-decoration:underline;">hello@nexdesk.com</a>
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
