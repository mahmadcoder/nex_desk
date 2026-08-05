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

• Reference: {{deal_no}}
• Total: {{currency}} {{amount}}
• Valid until: {{valid_until}}

Read it over and tell us what you would like changed. Nothing is committed until you say so, and there is no obligation either way.

If the budget or the timing is off, say so rather than walking away — we would rather adjust the scope than lose the conversation.

{{sender_name}}
Nex Desk`,
  },

  quotation_followup: {
    subject: "💬 Any thoughts on the quote for {{project_name}}?",
    body: `Hi {{client_name}},

Just checking in on the quote we sent for {{project_name}} — {{currency}} {{amount}}, sent {{days_since}} days ago.

No pressure at all. If the timing is wrong or the budget does not fit, say so and we will adjust the scope rather than push. A straight no is genuinely fine too — it is more useful to us than silence.

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

If you would rather send the signed page or a payment receipt on WhatsApp than by email, use {{whatsapp}} — it reaches us just as fast.

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

Payment details are on the invoice.

**Once you have paid, send us the receipt** — by reply, or on WhatsApp at {{whatsapp}}, whichever is easier. We confirm the same day.

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

  invoice_final_settled: {
    subject: "🎯 Paid in full — thank you, {{client_name}}",
    body: `Hi {{client_name}},

Your payment of **{{currency}} {{amount}}** has been received, and that clears the final instalment.

## Your account is settled

• Contract value: {{contract_total}}
• Outstanding balance: **Nothing. You're all square.**

There are no further invoices for {{project_name}}. If you ever see another one from us for this project, query it — it would be a mistake on our side.

Your receipt is attached, and every invoice and document remains available in your portal for your records.

It has been a pleasure doing this work. If there is anything else you need — or anyone you'd introduce us to — you know where we are.

Best regards,
{{sender_name}}`,
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

## Where things stand

• Reason recorded: {{reason}}
• Work delivered: {{work_done}}
• Refund due to you: {{refund_amount}}

{{settlement_note}}

Everything produced up to this point is yours to keep, and stays available in your portal:
{{portal_url}}

Any refund is sent within seven working days. Bank and transfer charges are not ours to refund — we return what actually reached us, less the cost of sending it back.

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

We are blocked on {{project_name}} until we hear back on the last round — it has been {{days_waiting}} days since we sent it over.

Here it is again:

{{staging_url}}

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

## Your warranty

Anything that turns out to be **broken in what we built** we fix free until **{{warranty_ends}}** — {{warranty_days}} days from today, which is when real defects surface once real people start using it. Tell us and we sort it.

Anything **new** — a feature, a page, a change of mind — is quoted first, so you always know the cost before we start rather than after. Raise one from your portal any time.

## Your account

{{settled_line}}

It has been a pleasure working with you.

{{sender_name}}
Nex Desk`,
  },

  testimonial_request: {
    subject: "⭐ Could you spare two minutes, {{client_name}}?",
    body: `Hi {{client_name}},

Now that {{project_name}} has been running for a couple of weeks — could we ask a small favour?

## A short video, if you have two minutes

Just your phone, held up, talking for **30 to 60 seconds**. No script, no setup, nothing to prepare. Three things are all we need:

• What you were worried about before you hired us
• How {{project_name}} has actually gone
• Whether you would work with us again

Send it back however is easiest — reply to this email, or WhatsApp it to {{whatsapp}}. It does not need to be neat; the honest ones are always the ones people believe.

## Or just write us a few lines

If a video is not your thing, a couple of honest sentences by reply is just as welcome. Either helps us enormously.

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

  client_agreement_accepted: {
    subject: "✍️ Agreement accepted — {{project_name}}",
    body: `Hi {{client_name}},

Thank you — your agreement for **{{project_name}}** is accepted and in force.

• Reference: {{deal_no}}
• Contract value: {{amount}}
• Accepted: {{accepted_at}}

A copy is attached for your records. Nothing further is needed from you — no printing, no signing, no scanning. Your acceptance is recorded against your account with the time you made it.

Best regards,
The Nex Desk Team`,
  },

  admin_agreement_accepted: {
    subject: "✍️ {{client_name}} accepted {{deal_no}}",
    body: `An agreement has been accepted in the client portal.

• Client: {{client_name}}
• Project: {{project_name}}
• Reference: {{deal_no}}
• Typed name: {{accepted_name}}
• When: {{accepted_at}}
• IP: {{ip}}

That is your record of acceptance — timestamp, typed name and IP against a signed-in portal session. Stronger than a photographed signature and it took them five seconds.

{{admin_url}}`,
  },

  client_service_added: {
    subject: "🧩 {{service_name}} is booked — that's {{service_count}} with us now",
    body: `Hi {{client_name}},

**{{service_name}}** is confirmed and booked. The agreement is attached.

## The new piece

• Service: {{service_name}}
• Price: {{currency}} {{amount}}

## Where that leaves us overall

• Services with us: {{service_count}}
• Combined contract value: {{combined_total}}

Each service runs as its own project with its own timeline, its own team and its own invoices — so nothing gets muddled and you can see exactly what is happening on each one separately.

Your portal now shows them side by side:

{{portal_url}}

Thanks for trusting us with more of it.

Best regards,
{{sender_name}}`,
  },

  admin_service_added_notice: {
    subject: "🧩 {{client_name}} added {{service_name}}",
    body: `An existing client has bought another service.

• Client: {{client_name}}
• New service: {{service_name}}
• Value: {{currency}} {{amount}}
• Services with us now: {{service_count}}
• Combined contract value: {{combined_total}}

The agreement, project, milestones and stage invoices have all been created automatically.

## Next

• Assign staff to the new project — it has nobody on it yet
• The advance invoice has already gone out; later stages are drafted

{{admin_url}}`,
  },

  referral_thank_you: {
    subject: "🤝 Thank you for the introduction, {{client_name}}",
    body: `Hi {{client_name}},

{{referred_name}} came to us because you pointed them our way — thank you. That means more to us than any advertising we could buy.

Referrals only happen when someone is confident enough to put their own name behind a recommendation, and we don't take that lightly. Whoever you send us gets looked after properly.

If there is ever anything we can do for you in return — a quick question, a second opinion, something small outside your current scope — just ask.

Best regards,
{{sender_name}}`,
  },

  client_welcome_back: {
    subject: "👋 Welcome back, {{client_name}}",
    body: `Hi {{client_name}},

Good to have you back.

Your account is active again, and everything from last time is still exactly where you left it — every document, invoice, milestone and file:

{{portal_url}}

Your sign-in details have not changed. If you have forgotten them, reply and we'll reset them straight away rather than making you go through a password-reset loop.

Tell us what you're planning and we'll put a scope and a fixed price together.

Best regards,
{{sender_name}}`,
  },

  project_thank_you: {
    subject: "🙏 Thank you, {{client_name}}",
    body: `Hi {{client_name}},

Now that {{project_name}} has had a little time to settle, we wanted to say thank you properly.

You were clear about what you wanted, you came back to us quickly when we needed decisions, and that is genuinely why this landed on time. Not every project does.

Two small things, only if you're willing:

• **A few honest lines about how it went.** What you were worried about beforehand, whether it turned out how you hoped, and whether you'd work with us again. We publish these, so say what you actually think.
• **An introduction.** If you know someone who needs similar work, pointing them our way is the single most useful thing you could do for us — and we look after anyone you send.

Everything from the project stays in your portal for as long as you need it:

{{portal_url}}

And if something breaks or you want to add to it later, you know where we are.

Best regards,
{{sender_name}}`,
  },

  staff_project_handover_notice: {
    subject: "🚀 {{project_name}} has been handed over",
    body: `Hi {{employee_name}},

{{project_name}} has been delivered to {{client_name}} and the handover pack has gone out.

Thanks for the work you put into it — the daily logs you filed are what kept the client informed the whole way through.

## What happens now

• The project is marked delivered and no further work is scheduled
• If the client asks for changes, they come back as a quoted change request — don't start on anything until it has been approved
• Your dashboard will drop this project from your active list

Nicely done.

{{sender_name}}`,
  },

  admin_project_handover_notice: {
    subject: "🚀 Handed over: {{project_name}} → {{client_name}}",
    body: `{{project_name}} has been handed over.

• Client: {{client_name}} ({{client_email}})
• Live URL: {{live_url}}
• Handover pack: attached, and filed in the client's documents

The project is marked delivered and the client has the credentials.

## Worth doing next

• Send the thank-you from the project page in a few days — there's a button for it
• Any further work now goes through a change request so it gets quoted and billed

{{sender_name}}`,
  },

  admin_change_request_notice: {
    subject: "🔁 Change requested: {{project_name}} — {{client_name}}",
    body: `{{client_name}} has asked for a change on {{project_name}}.

• What they asked for: {{request_title}}

Their words:

{{request_detail}}

## Next step

Quote it from the project page. Nothing gets built until the client approves the price, and handover stays locked until that invoice is paid.

{{admin_url}}`,
  },

  client_document_received: {
    subject: "✅ We've received your signed document",
    body: `Hi {{client_name}},

Thanks — **{{doc_title}}** has arrived safely and is now on file against your account.

Nothing further is needed from you. If it turns out anything is missing or unclear, we'll come back to you directly rather than leaving you guessing.

You can see every document on your account here:

{{portal_url}}

Best regards,
{{sender_name}}`,
  },

  client_work_update: {
    subject: "🛠 Progress on {{project_name}} — now {{progress}}% complete",
    body: `Hi {{client_name}},

Here's what the team did on {{project_name}} today.

## Work completed on {{work_date}}

{{tasks_completed}}

## Where the project stands

• Progress: **{{progress}}% complete**

You don't need to reply to this — it's a record so you always know what's moving without having to ask. Every shared update, your milestones, invoices and documents are in your portal:

{{portal_url}}

If anything here doesn't match what you expected, tell us early rather than late.

Best regards,
{{sender_name}}`,
  },

  /* ─────────────── Staff: pay and leave ─────────────── */

  employee_salary_revised: {
    subject: "📈 Your salary has been revised, {{employee_name}}",
    body: `Hi {{employee_name}},

Your salary has been reviewed and revised.

• Previous: {{previous_salary}}
• New salary: **{{new_salary}}** per month
• Effective from: {{effective_from}}

{{reason}}

An updated offer letter is attached, stating the new figure — keep it with your records; it replaces the previous one.

Nothing else about your engagement changes: same role, same terms, same notice period.

If anything here does not match what we discussed, tell us before the next payroll run rather than after.

Best regards,
{{sender_name}}`,
  },

  employee_bonus: {
    subject: "🎁 A bonus for you, {{employee_name}}",
    body: `Hi {{employee_name}},

You're getting a bonus of **{{amount}}**, paid with your next salary.

{{reason}}

Bonuses here are not automatic and they're not a formality — this one was decided because of specific work you did. Thank you for it.

Best regards,
{{sender_name}}`,
  },

  admin_leave_request: {
    subject: "🌴 Leave request: {{employee_name}} ({{start_date}} → {{end_date}})",
    body: `{{employee_name}} has requested leave.

• Type: {{leave_type}}
• Dates: {{start_date}} → {{end_date}}
• Days: {{days}}
• Reason: {{reason}}

## Before you approve

Check what they are on. Approving leave into a deadline is how projects slip quietly.

{{admin_url}}`,
  },

  leave_approved: {
    subject: "✅ Leave approved — {{start_date}} to {{end_date}}",
    body: `Hi {{employee_name}},

Your {{leave_type}} is approved.

• Dates: {{start_date}} → {{end_date}}
• Days: {{days}}

{{note}}

Two things before you go: hand over anything time-sensitive to whoever is covering, and put your last work log in so the client's timeline does not just stop without explanation.

Enjoy it — properly. Don't check in.

{{sender_name}}`,
  },

  leave_declined: {
    subject: "Leave request — {{start_date}} to {{end_date}}",
    body: `Hi {{employee_name}},

We can't approve your {{leave_type}} for {{start_date}} → {{end_date}}.

{{note}}

This is about timing, not about the request. Come back with alternative dates and we'll do our best to make them work.

{{sender_name}}`,
  },

  salary_paid: {
    subject: "💸 Your pay for {{period}} has been sent",
    body: `Hi {{employee_name}},

Your salary for {{period}} has been transferred.

• Amount: {{amount}}
• Sent on: {{paid_on}}
• Method: {{method}}
• Reference: {{reference}}

{{note}}

{{slip_line}}

Depending on your bank this can take a day or two to show up. If it has not arrived after that, tell us and we will chase it with our side.

Every payment we have made to you, with its slip, is on your My Pay page when you sign in.

{{sender_name}}
Nex Desk`,
  },

  admin_bonus_notice: {
    subject: "🎁 Bonus recorded: {{employee_name}} — {{amount}}",
    body: `A bonus has been recorded.

• Employee: {{employee_name}}
• Amount: {{amount}}
• Reason: {{reason}}

The employee has been emailed. Remember to include it in the next payroll run — this records the decision, it does not pay anyone.

{{employee_url}}`,
  },

  kickoff_reminder: {
    subject: "⏳ {{project_name}} is waiting on {{missing_count}} thing(s) from you",
    body: `Hi {{client_name}},

{{project_name}} is moving, but part of it is waiting on material only you can provide.

## Still needed

{{missing_items}}

Tick each one off in your portal as you send it — upload files there, or send them on WhatsApp at {{whatsapp}} if that is easier:

{{portal_url}}

The sooner these land, the sooner we can finish. Nothing else is blocking on our side.

Best regards,
{{sender_name}}`,
  },

  client_monthly_report: {
    subject: "📊 Your monthly report from Nex Desk",
    body: `Hi {{client_name}},

Your monthly report is attached above this line — if you are reading this exact text, the report body was not filled in before sending. Reply and we will resend it properly.

Best regards,
{{sender_name}}`,
  },

  admin_milestone_approved: {
    subject: "👍 {{client_name}} approved: {{milestone_title}}",
    body: `The client has signed off a milestone in their portal.

• Client: {{client_name}}
• Project: {{project_name}}
• Milestone: {{milestone_title}}

That approval is recorded against their signed-in session with a timestamp — it is your acceptance record for this stage.

## Worth doing now

If a payment stage was tied to this milestone, send its invoice — approval is the natural moment to bill.

{{admin_url}}`,
  },

  admin_kickoff_complete: {
    subject: "✅ {{client_name}} has sent everything — {{project_name}} is unblocked",
    body: `Every kickoff item for {{project_name}} is now ticked.

Nothing is waiting on the client any more. From here, any delay is ours — worth telling the team the runway is clear.

{{admin_url}}`,
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

  /* ─────────────── Costs paid on the client's behalf ─────────────── */

  client_expense_added: {
    subject: "🧾 {{category}} bought for {{project_name}} — receipt attached",
    body: `Hi {{client_name}},

We've bought something for {{project_name}} on your behalf, and here are the details while they're fresh.

## What it is

• {{category}}: {{item}}
• Supplier: {{vendor}}
• Bought on: {{purchased_on}}
• Amount: {{amount}}

{{charge_line}}

{{details}}

{{renewal_line}}

{{receipt_line}}

Everything we buy for you is recorded in your portal with its receipt, so you can check any charge yourself at any time:

{{portal_url}}

Any question at all about this, just reply.

{{sender_name}}
Nex Desk`,
  },

  admin_expense_notice: {
    subject: "🧾 Recorded: {{item}} for {{client_name}} — {{amount}}",
    body: `A cost has been recorded against {{client_name}}.

• {{category}}: {{item}}
• Supplier: {{vendor}}
• Paid: {{cost}}
• Charged to client: {{amount}}
• Margin on it: {{margin}}
• Bought on: {{purchased_on}}

{{renewal_line}}

Open the client:
{{admin_url}}`,
  },

  expenses_invoiced: {
    subject: "🧾 Invoice {{invoice_no}} — costs paid on your behalf",
    body: `Hi {{client_name}},

Invoice {{invoice_no}} is attached. It covers things we bought for you rather than any of our own work.

## What's on it

{{items}}

• Total: {{amount}}
• Due: {{due_date}}

Every one of these has its receipt saved in your portal, so you can check any line against what we actually paid:

{{portal_url}}

If anything on here looks wrong, tell us before you pay it and we'll sort it out.

{{sender_name}}
Nex Desk`,
  },

  expense_renewal: {
    subject: "🔔 {{item}} renews on {{due_date}}",
    body: `Hi {{client_name}},

A quick heads-up so nothing lapses without you knowing.

• {{category}}: {{item}}
• Renews on: {{due_date}}
• Last time it cost: {{amount}}

{{consequence_line}}

Would you like us to renew it for you? Reply and we will handle it and invoice at cost — no markup, and the receipt goes into your portal as usual.

If you would rather take it over yourself, say so and we will send you everything you need to do it.

{{sender_name}}
Nex Desk`,
  },

  admin_renewals_due: {
    subject: "🔔 {{count}} renewal(s) coming up",
    body: `Renewals falling due soon.

{{items}}

Chase whichever the client has not confirmed. A lapsed domain or hosting account is the one failure a client never forgets.

Open the panel:
{{admin_url}}`,
  },

  /* ─────────────── Safety nets ───────────────
   *
   * Every key below is SENT with a bodyOverride, so these bodies normally
   * never appear. They exist because `sendEmail` refuses to send a template it
   * has no copy for and logs a failure nobody reads — so the day an override
   * is dropped or arrives empty, this is what goes out instead of nothing.
   */

  admin_client_return_request: {
    subject: "👋 {{client_name}} wants to work together again",
    body: `{{client_name}} has asked to reactivate their account from their portal.

• Client: {{client_name}}
• Email: {{client_email}}

What they said:

{{message}}

Reactivating them from their profile sends the welcome-back email and reopens their portal:
{{admin_url}}`,
  },

  admin_deadline_warning: {
    subject: "📅 Project deadlines coming up",
    body: `Deadlines are approaching on one or more projects.

Open the board to see which:
{{admin_url}}`,
  },

  admin_quotes_cold: {
    subject: "🥶 Quotes with no answer",
    body: `One or more quotes have been chased to the end of the sequence with no reply.

Close them out or pick up the phone — a quote with no decision is worse than a no.

Open the pipeline:
{{admin_url}}`,
  },

  lead_reply: {
    subject: "Re: your enquiry to Nex Desk",
    body: `Hi {{client_name}},

Thanks again for getting in touch about {{service_interest}}.

{{message}}

If you have any questions, just reply to this email — it comes straight to us.

{{sender_name}}
Nex Desk`,
  },

  newsletter_broadcast: {
    subject: "📬 An update from Nex Desk",
    body: `Hi {{client_name}},

{{message}}

{{sender_name}}
Nex Desk`,
  },

  manual: {
    subject: "A message from Nex Desk",
    body: `Hi {{client_name}},

{{message}}

{{sender_name}}
Nex Desk`,
  },
};
