import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/server";
import { fillTemplate } from "@/lib/utils";
import { generateDocument, type DocType } from "@/lib/pdf/generate";
import { renderHtml } from "./layout";

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
      subject: "You're on the list — welcome to Nex Desk",
      body: `Hi {{client_name}},

Thanks for subscribing. You'll now get our monthly dispatch.

Each issue is short and practical:

• What we shipped, and the engineering decisions behind it
• Lessons from real client builds — including the ones that went sideways
• Practical notes on web, mobile and cloud architecture

One email a month. No filler, and you can unsubscribe from any issue.

Best regards,
The Nex Desk Team`,
    },

    client_welcome: {
      subject: "Welcome to Nex Desk — your portal is ready",
      body: `Hi {{client_name}},

Welcome aboard. We're glad to be working with you.

Your client portal is live. You can sign in any time to track progress, review documents and see who is working on your project:

• Portal: {{portal_url}}
• Email: {{client_email}}
• Password: {{client_password}}

Here's what happens next:

• We'll send a short intake form to collect your brand files, content and any references. It takes about five minutes.
• Within two working days of getting it back, you'll receive your project outline with the timeline and milestones.
• Work starts on the agreed date, and progress appears in your portal as we go.

Worth knowing:

• Working hours: Monday to Saturday, 10am to 7pm PKT
• We reply to every message within one working day
• Your agreement includes two full rounds of revisions per deliverable

Any questions before we start, just reply to this email — a real person reads every one.

Best regards,
Ahmad Sadiq
Nex Desk Software Agency`,
    },

    account_email_changed: {
      subject: "Your Nex Desk sign-in email has changed",
      body: `Hi {{name}},

The email address you use to sign in has been updated to {{new_email}}.

• Sign in here: {{login_url}}

Your password has not changed. From now on, use the new address above.

If you weren't expecting this, reply to this email straight away.

Nex Desk`,
    },

    employee_joining_en: {
      subject: "Welcome to Nex Desk — your staff account is ready",
      body: `Hi {{employee_name}},

Welcome to the team. You're joining us as {{job_title}} ({{seniority}}), starting {{joining_date}}.

Your staff panel account is ready. Sign in to see the clients assigned to you, track your projects and submit your daily work log:

• Sign in: {{staff_login_url}}
• Email: {{staff_email}}
• Password: {{staff_password}}

Please change your password after your first sign-in.

A few things to know:

• Submit a work log at the end of each working day — it's how project progress reaches the client
• You'll only see the clients and projects assigned to you
• Flag blockers in your log; that's the fastest way to get them cleared

Glad to have you with us.

Best regards,
The Nex Desk Team`,
    },
    employee_joining_ar: {
      subject: "مرحباً بك في نيكس ديسك — حسابك جاهز",
      body: `مرحباً {{employee_name}}،

أهلاً بك في الفريق. تنضم إلينا بوظيفة {{job_title}} ({{seniority}}) اعتباراً من {{joining_date}}.

حسابك على لوحة الموظفين جاهز الآن. سجّل الدخول لعرض العملاء المسندين إليك ومتابعة مشاريعك وتسجيل تقرير عملك اليومي:

• رابط الدخول: {{staff_login_url}}
• البريد الإلكتروني: {{staff_email}}
• كلمة المرور: {{staff_password}}

يرجى تغيير كلمة المرور بعد أول تسجيل دخول.

مع أطيب التحيات،
فريق نيكس ديسك`,
    },
    employee_joining_fr: {
      subject: "Bienvenue chez Nex Desk — votre compte est prêt",
      body: `Bonjour {{employee_name}},

Bienvenue dans l'équipe. Vous nous rejoignez au poste de {{job_title}} ({{seniority}}) à partir du {{joining_date}}.

Votre compte est prêt. Connectez-vous pour voir les clients qui vous sont assignés, suivre vos projets et saisir votre rapport quotidien :

• Connexion : {{staff_login_url}}
• E-mail : {{staff_email}}
• Mot de passe : {{staff_password}}

Merci de changer votre mot de passe après la première connexion.

Cordialement,
L'équipe Nex Desk`,
    },
    employee_joining_de: {
      subject: "Willkommen bei Nex Desk — Ihr Konto ist bereit",
      body: `Hallo {{employee_name}},

willkommen im Team. Sie starten am {{joining_date}} als {{job_title}} ({{seniority}}).

Ihr Konto ist eingerichtet. Melden Sie sich an, um Ihre zugewiesenen Kunden zu sehen, Projekte zu verfolgen und Ihren Tagesbericht einzureichen:

• Anmeldung: {{staff_login_url}}
• E-Mail: {{staff_email}}
• Passwort: {{staff_password}}

Bitte ändern Sie Ihr Passwort nach der ersten Anmeldung.

Mit freundlichen Grüßen,
Das Nex Desk Team`,
    },
    employee_joining_es: {
      subject: "Bienvenido a Nex Desk — tu cuenta está lista",
      body: `Hola {{employee_name}},

Bienvenido al equipo. Te incorporas como {{job_title}} ({{seniority}}) a partir del {{joining_date}}.

Tu cuenta ya está lista. Inicia sesión para ver los clientes asignados, seguir tus proyectos y registrar tu parte de trabajo diario:

• Acceso: {{staff_login_url}}
• Correo: {{staff_email}}
• Contraseña: {{staff_password}}

Cambia tu contraseña después del primer acceso.

Saludos cordiales,
El equipo de Nex Desk`,
    },

    /* ── Internal notices ── */
    admin_client_created_notice: {
      subject: "New client provisioned: {{client_name}}",
      body: `A new client account has been created.

• Name: {{client_name}}
• Email: {{client_email}}

Portal credentials have been sent to the client.`,
    },
    internal_new_lead: {
      subject: "New lead",
      body: "A new enquiry came in through the website.",
    },
    internal_new_subscriber: {
      subject: "New newsletter subscriber",
      body: "Someone new subscribed to the newsletter.",
    },
    internal_payment_received: {
      subject: "Payment received",
      body: "A payment has been recorded.",
    },
    admin_document_uploaded_notice: {
      subject: "Client uploaded a signed document",
      body: "A client has uploaded a signed document to their portal.",
    },
    admin_work_log_notice: {
      subject: "Daily work log submitted",
      body: "A team member submitted their daily work log.",
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
