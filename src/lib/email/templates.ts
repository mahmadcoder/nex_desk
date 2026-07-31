/**
 * Canonical email copy.
 *
 * This is the source of truth. A matching row in the `email_templates` table
 * OVERRIDES the entry here, which is what lets the admin edit wording in the
 * Email Centre — but nothing here depends on that row existing.
 *
 * That matters: `lead_autoreply` previously lived only in the database, so a
 * database that had not been seeded sent people a blank email titled
 * "A message from Nex Desk". Every key the code can send must have an entry
 * below.
 *
 * `supabase/email_templates.sql` seeds the same copy into the table so the
 * Email Centre has something to list and edit.
 *
 * Placeholders are `{{snake_case}}` and are filled by `fillTemplate`. An
 * unmatched placeholder is left visible on purpose — a stray `{{amount}}` in a
 * sent email is obvious, whereas silently blanking it hides the bug.
 */
export type EmailTemplate = { subject: string; body: string };

export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  /* ─────────────── Enquiry & marketing ─────────────── */

  lead_autoreply: {
    subject: "👋 Thanks for getting in touch, {{client_name}}",
    body: `Hi {{client_name}},

Thanks for reaching out to Nex Desk. Your enquiry has arrived and a real person is reading it — this is not an automated queue.

Here is what we have on file:

• Enquiry about: {{service_interest}}
• Indicative budget: {{budget_range}}
• Preferred timeline: {{timeline}}

What happens next:

• Within one working day we reply personally — either with answers, or with a few questions so we can scope the work properly.
• Once we understand the requirement, you get a written quote covering the full scope, a fixed price, what is included, what is not, and a delivery timeline.
• Nothing is committed until you approve that quote. There is no obligation at any stage.

If anything changes in the meantime, or you want to add detail, just reply to this email — it comes straight to us.

You can see recent work here:
{{portal_url}}

Best regards,
{{sender_name}}
Nex Desk Software Agency`,
  },

  newsletter_welcome: {
    subject: "📬 You're on the list — welcome to Nex Desk",
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

  /* ─────────────── Client onboarding ─────────────── */

  client_welcome: {
    subject: "🎊 Welcome to Nex Desk — your portal is ready",
    body: `Hi {{client_name}},

Welcome aboard. We're glad to be working with you.

Your client portal is live. Sign in any time to track progress, review documents and see who is working on your project:

• Portal: {{portal_url}}
• Email: {{client_email}}
• Password: {{client_password}}

What happens next:

• We'll send a short intake form to collect your brand files, content and any references. It takes about five minutes.
• Within two working days of getting it back, you'll receive your project outline with the timeline and milestones.
• Work starts on the agreed date, and progress appears in your portal as we go.

Worth knowing:

• Working hours: Monday to Saturday, 10am to 7pm PKT
• We reply to every message within one working day
• Your agreement includes two full rounds of revisions per deliverable

Any questions before we start, just reply to this email — a real person reads every one.

Best regards,
Nex Desk Software Agency`,
  },

  portal_invite: {
    subject: "🔑 Your Nex Desk client portal",
    body: `Hi {{client_name}},

You have a portal for {{project_name}} where you can follow progress, download every document and upload files to us.

• Portal: {{portal_url}}
• Email: {{client_email}}
• Password: {{client_password}}

Please change your password after your first sign-in.

{{sender_name}}
Nex Desk`,
  },

  account_email_changed: {
    subject: "🔐 Your Nex Desk sign-in email has changed",
    body: `Hi {{name}},

The email address you use to sign in has been updated to {{new_email}}.

• Sign in here: {{login_url}}

Your password has not changed. From now on, use the new address above.

If you weren't expecting this, reply to this email straight away.

Nex Desk`,
  },

  /* ─────────────── Sales ─────────────── */

  quotation_sent: {
    subject: "📄 Your quote for {{project_name}}",
    body: `Hi {{client_name}},

Here is your quote for {{project_name}}. The attached PDF sets out the full scope, the price, what is included, what is not, and how long it will take.

Total: {{currency}} {{amount}}

Read it over and tell us what you would like changed. Nothing is locked until you say so.

{{sender_name}}
Nex Desk`,
  },

  quotation_followup: {
    subject: "💬 Any thoughts on the quote for {{project_name}}?",
    body: `Hi {{client_name}},

Just checking in on the quote we sent for {{project_name}}.

No pressure at all. If the timing is wrong or the budget does not fit, say so and we will adjust the scope rather than push.

Happy to jump on a ten-minute call if that is easier.

{{sender_name}}
Nex Desk`,
  },

  deal_locked: {
    subject: "🤝 Confirmed — {{project_name}} is booked ({{deal_no}})",
    body: `Hi {{client_name}},

We are on. {{project_name}} is officially booked.

Your agreement is attached. It covers everything we discussed:

• Full scope and deliverables
• Price: {{currency}} {{amount}}
• Payment schedule
• Timeline, with delivery by {{deadline}}
• Revisions included
• Terms and conditions

Keep this PDF — it is the reference point for the whole project.

Next step: your advance invoice is on its way. Work begins the day it clears.

You can follow progress any time in your portal:
{{portal_url}}

{{sender_name}}
Nex Desk`,
  },

  change_order: {
    subject: "🔁 Change to {{project_name}} — your approval needed",
    body: `Hi {{client_name}},

What you have asked for sits outside the agreed scope, so here is a change order rather than a surprise on the final invoice.

The attached PDF covers:

• Exactly what is being added
• Additional cost: {{currency}} {{amount}}
• Additional time added to the deadline

Reply "approved" and we will build it. Say no and the original scope stands — no hard feelings either way.

{{sender_name}}
Nex Desk`,
  },

  /* ─────────────── Money ─────────────── */

  invoice_sent: {
    subject: "🧾 Invoice {{invoice_no}} — {{currency}} {{amount}}",
    body: `Hi {{client_name}},

Invoice {{invoice_no}} is attached.

• Amount due: {{currency}} {{amount}}
• Due date: {{due_date}}

Payment details are on the invoice. Send us the receipt once you have paid and we will confirm the same day.

{{sender_name}}
Nex Desk`,
  },

  payment_received: {
    subject: "✅ Payment received — thank you, {{client_name}}",
    body: `Hi {{client_name}},

Your payment of {{currency}} {{amount}} has been received and recorded.

The attached receipt shows the date, method, reference number and any remaining balance.

{{project_name}} moves forward from here, and your next progress update will follow shortly.

{{sender_name}}
Nex Desk`,
  },

  payment_reminder: {
    subject: "⏰ Invoice {{invoice_no}} is due on {{due_date}}",
    body: `Hi {{client_name}},

A quick reminder that invoice {{invoice_no}} for {{currency}} {{amount}} is due on {{due_date}}.

If you have already sent it, please ignore this — payments take a day or two to appear on our side.

{{sender_name}}
Nex Desk`,
  },

  payment_overdue: {
    subject: "⚠️ Invoice {{invoice_no}} is now past due",
    body: `Hi {{client_name}},

Invoice {{invoice_no}} for {{currency}} {{amount}} was due on {{due_date}} and is still showing as unpaid.

Work on {{project_name}} is paused until it clears. If something is holding it up, tell us — we would much rather agree a schedule than stop.

{{sender_name}}
Nex Desk`,
  },

  retainer_renewal: {
    subject: "🔄 Your Nex Desk retainer renews on {{due_date}}",
    body: `Hi {{client_name}},

Your maintenance retainer renews on {{due_date}} at {{currency}} {{amount}} per month.

There is nothing to do if you are happy to continue. If you would like to change the plan or stop, just reply and we will sort it.

{{sender_name}}
Nex Desk`,
  },

  refund_cancellation: {
    subject: "{{project_name}} — cancellation confirmed",
    body: `Hi {{client_name}},

Confirming that {{project_name}} is cancelled as of today.

A full statement of work completed to date and any refund due to you is set out below this line by your project manager.

Refunds are processed within seven working days. Every file completed so far remains available in your portal:
{{portal_url}}

If circumstances change we would be glad to pick this back up.

{{sender_name}}
Nex Desk`,
  },

  /* ─────────────── Delivery ─────────────── */

  project_kickoff: {
    subject: "🚀 {{project_name}} starts now — what we need from you",
    body: `Hi {{client_name}},

Your payment has cleared and {{project_name}} is underway.

To hold the {{deadline}} deadline, we need the following within three working days:

• Logo and brand files (AI, SVG or high-resolution PNG)
• Text content for each page, or a rough draft
• Photographs or product images
• Domain and hosting access
• Any existing analytics or social accounts to connect

Upload it all in your portal — no need to email large files:
{{portal_url}}

One more thing: please name one person on your side who can approve work. Decisions by committee are the single biggest cause of missed deadlines.

{{sender_name}}
Nex Desk`,
  },

  progress_update: {
    subject: "📊 {{project_name}} — {{progress}}% complete",
    body: `Hi {{client_name}},

Here is where {{project_name}} stands. We are at {{progress}}% complete.

Recent work:
{{recent_updates}}

Milestones:
{{milestone_summary}}

The attached report has the full breakdown, and live progress is always in your portal:
{{portal_url}}

{{sender_name}}
Nex Desk`,
  },

  staging_ready: {
    subject: "👀 {{project_name}} is ready for your review",
    body: `Hi {{client_name}},

{{project_name}} is on the staging link and ready for you to go through:

{{staging_url}}

Click everything, and try it on your phone too. Note anything that looks off and send it as one list rather than as you find it — that way we fix it all in a single pass.

We need your feedback within three working days to hold the {{deadline}} deadline.

{{sender_name}}
Nex Desk`,
  },

  feedback_needed: {
    subject: "⏳ Waiting on your feedback for {{project_name}}",
    body: `Hi {{client_name}},

We are blocked on {{project_name}} until we hear back on the last round.

Worth flagging: the {{deadline}} deadline moves by however long we wait. That is not a penalty, just how the schedule works.

A quick "looks good" is plenty if you have no changes.

{{sender_name}}
Nex Desk`,
  },

  project_on_hold: {
    subject: "⏸️ {{project_name}} is on hold",
    body: `Hi {{client_name}},

{{project_name}} is paused as of today.

Everything completed so far is saved and nothing is lost. Tell us when you are ready and we will pick up exactly where we stopped.

{{sender_name}}
Nex Desk`,
  },

  project_delivered: {
    subject: "🎉 {{project_name}} is live",
    body: `Hi {{client_name}},

{{project_name}} is delivered and live.

The attached handover document has everything:

• All login details and credentials
• Where the source files live
• A short guide to updating content yourself
• The warranty period and what it covers
• Support options from here

You own all of it outright.

One month of free bug support starts today.

It has been a pleasure working with you.

{{sender_name}}
Nex Desk`,
  },

  testimonial_request: {
    subject: "⭐ Could you spare two minutes, {{client_name}}?",
    body: `Hi {{client_name}},

Now that {{project_name}} has been running for a couple of weeks — would you write us a few lines about how it went?

Anything honest is useful: what you were worried about beforehand, whether it turned out how you hoped, and whether you would work with us again.

And if you know anyone who needs similar work, an introduction means a great deal to us.

{{sender_name}}
Nex Desk`,
  },

  domain_expiry: {
    subject: "🔔 Action needed — your domain expires on {{due_date}}",
    body: `Hi {{client_name}},

Your domain and hosting expire on {{due_date}}.

If they lapse, your site goes offline and email stops working. Recovering an expired domain is expensive and sometimes impossible.

We can renew it for you — just say the word and we will invoice at cost.

{{sender_name}}
Nex Desk`,
  },

  /* ─────────────── Staff onboarding ─────────────── */

  employee_joining_en: {
    subject: "🎉 Welcome to Nex Desk, {{employee_name}} — your offer letter and account",
    body: `Hi {{employee_name}},

Welcome to Nex Desk. We're glad to have you.

**Your offer letter is attached to this email.** It sets out your position, your compensation and the terms of the engagement in full — please read it, and reply to this email to confirm you accept.

## Your engagement at a glance

• Position: {{job_title}} ({{seniority}})
• Employment type: {{employment_type}}
• Start date: {{joining_date}}
• Compensation: {{salary}}, paid monthly within the first five working days of the following month
• Based: {{city}}, {{country}}

## Your account

Sign in to see the clients assigned to you, track your projects and submit your daily work log:

• Sign in: {{staff_login_url}}
• Email: {{staff_email}}
• Password: {{staff_password}}

**Please change your password after your first sign-in**, and keep these details to yourself.

## How we work

• Monday to Saturday are working days. Sunday is an official rest day — nothing is expected of you
• Submit a work log at the end of each working day; it is how your progress reaches the client and how your delivery record is kept
• You'll only see the clients and projects assigned to you
• Flag blockers in your log rather than sitting on them — that's the fastest way to get them cleared
• Client code, credentials and commercial terms are confidential; the attached letter covers this in detail

If anything in the letter looks wrong, tell us before your start date and we'll reissue it.

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

  /* ─────────────── Internal notices (to the agency) ─────────────── */

  internal_new_lead: {
    subject: "🔥 New lead — {{client_name}}",
    body: `A new enquiry came in through the website.

• Name: {{client_name}}
• Email: {{client_email}}
• Wants: {{service_interest}}
• Budget: {{budget_range}}
• Timeline: {{timeline}}`,
  },

  internal_new_subscriber: {
    subject: "📬 New newsletter subscriber",
    body: "Someone new subscribed to the newsletter.",
  },

  internal_payment_received: {
    subject: "Payment received",
    body: "A payment has been recorded.",
  },

  admin_client_created_notice: {
    subject: "🧑‍💼 New client provisioned: {{client_name}}",
    body: `A new client account has been created.

• Name: {{client_name}}
• Email: {{client_email}}

Portal credentials have been sent to the client.`,
  },

  admin_employee_created_notice: {
    subject: "🧑‍💻 New hire onboarded: {{employee_name}} — {{job_title}}",
    body: `A new employee has been added to Nex Desk and onboarded automatically.

• Name: {{employee_name}}
• Email: {{employee_email}}
• Position: {{job_title}} ({{seniority}})
• Employment type: {{employment_type}}
• Start date: {{joining_date}}
• Compensation: {{salary}}
• Based: {{city}}, {{country}}

What was sent to them: their staff panel login and their offer letter as a PDF.
Delivery status: {{email_status}}

Next: assign them to a client so they can start logging work. Their profile is at {{employee_url}}.`,
  },

  /* ─────────────── Assignments ─────────────── */

  employee_assigned_to_client: {
    subject: "📌 You've been assigned to {{client_name}}",
    body: `Hi {{employee_name}},

You've been assigned to a client account.

• Client: {{client_name}}
• Company: {{client_company}}
• Your role on this account: {{job_title}}

## What this means

• The client and their projects now appear in your control panel
• Log your work on this account daily — the client sees the entries you mark as shared
• Anything blocking you goes in the same log; that is how it reaches us

Open the account here: {{client_url}}

Please introduce yourself to the client by replying to this email if you'd like their address, or through your usual channel once work starts.

Thanks,
{{sender_name}}`,
  },

  client_team_assigned: {
    subject: "🧑‍💻 {{employee_name}} is now on your account",
    body: `Hi {{client_name}},

We've assigned a specialist to your account so you always know who is doing the work.

## Who you're working with

• Name: {{employee_name}}
• Role: {{job_title}} ({{seniority}})
• Focus: {{skills}}

They will be logging their work against your project as it happens. You can see that timeline, your milestones, invoices and documents in your portal at any time:

{{portal_url}}

If you'd like to raise anything with them directly, reply to this email and we'll put you in touch. For anything commercial — scope, timeline or billing — keep coming to us as usual.

Best regards,
{{sender_name}}`,
  },

  admin_document_uploaded_notice: {
    subject: "📥 Client uploaded a signed document",
    body: "A client has uploaded a signed document to their portal.",
  },

  admin_work_log_notice: {
    subject: "📝 Daily work log submitted",
    body: "A team member submitted their daily work log.",
  },
};
