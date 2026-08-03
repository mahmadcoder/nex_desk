-- ============================================================
-- NEX DESK — EMAIL TEMPLATES (authoritative source)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: existing rows are updated in place.
--
-- This is the single source of truth for the seeded templates. `seed.sql`
-- no longer carries copies of them, so there is only one place to edit.
--
-- Rows edited through the admin Email Centre WILL be overwritten by a re-run.
--
-- Formatting the layout understands (src/lib/email/layout.ts):
--   A leading emoji on the SUBJECT becomes a badge above the heading, and
--     still shows in the inbox subject line.
--   '## Heading'    → section heading, so long emails can be scanned
--   '• ' lines      → callout card; 'Label: value' renders as a styled pair
--   a bare URL      → button
--   '**text**'      → bold (parsed after escaping, so it is safe)
--
-- Variables available:
--   {{client_name}} {{company_name}} {{project_name}} {{sender_name}}
--   {{deal_no}} {{invoice_no}} {{amount}} {{currency}} {{due_date}} {{deadline}}
--   {{progress}} {{staging_url}} {{portal_url}}
--   {{client_email}} {{client_password}}          (credential emails)
--   {{recent_updates}} {{milestone_summary}}      (progress update)
--   {{service_interest}} {{budget_range}} {{timeline}}   (lead auto-reply)
-- ============================================================

insert into email_templates (key, name, subject, body, attach_doc, description) values

('lead_autoreply','Lead auto-reply','👋 Thanks for getting in touch, {{client_name}}',
E'Hi {{client_name}},\n\nThanks for reaching out to Nex Desk. Your enquiry has arrived and a real person is reading it — this is not an automated queue.\n\n## What we have on file\n\n• Enquiry about: {{service_interest}}\n• Indicative budget: {{budget_range}}\n• Preferred timeline: {{timeline}}\n\nIf any of that is wrong, just reply and correct it.\n\n## What happens next\n\n• **Within one working day** we reply personally — either with answers, or with a few questions so we can scope the work properly.\n• Once we understand the requirement, you get a **written quote** covering the full scope, a fixed price, what is included, what is not, and a delivery timeline.\n• **Nothing is committed** until you approve that quote. There is no obligation at any stage.\n\nIf anything changes in the meantime, or you want to add detail, just reply to this email — it comes straight to us.\n\nYou can see recent work here:\n{{portal_url}}\n\nBest regards,\n{{sender_name}}\nNex Desk Software Agency', null,'Fires automatically the moment someone submits the contact form.'),

('quotation_sent','Quotation sent','📄 Your quote for {{project_name}}',
E'Hi {{client_name}},\n\nHere is your quote for {{project_name}}. The attached PDF sets out the full scope, the price, what is included, what is not, and how long it will take.\n\n• Reference: {{deal_no}}\n• Total: {{currency}} {{amount}}\n• Valid until: {{valid_until}}\n\nRead it over and tell us what you would like changed. **Nothing is committed until you say so**, and there is no obligation either way.\n\nIf the budget or the timing is off, say so rather than walking away — we would rather adjust the scope than lose the conversation.\n\n{{sender_name}}\nNex Desk','quotation','Sent by "Send as a quote" on the deal form. Parks the deal in the pipeline as an open quote.'),

('quotation_followup','Quote follow-up','💬 Any thoughts on the quote for {{project_name}}?',
E'Hi {{client_name}},\n\nJust checking in on the quote we sent for {{project_name}} — {{currency}} {{amount}}, sent {{days_since}} days ago.\n\nNo pressure at all. If the timing is wrong or the budget does not fit, say so and we will adjust the scope rather than push. A straight no is genuinely fine too — it is more useful to us than silence.\n\nHappy to jump on a ten-minute call if that is easier.\n\n{{sender_name}}\nNex Desk', null,'Sent automatically by the daily cron on day 3, 7 and 14 after a quote goes out, then it stops. NO attachment — the client already has the PDF.'),

('deal_locked','Deal confirmed','🤝 Confirmed — {{project_name}} is booked ({{deal_no}})',
E'Hi {{client_name}},\n\nWe are on. **{{project_name}} is officially booked.**\n\n## Your agreement\n\nThe attached PDF covers everything we discussed:\n\n• Contract value: {{currency}} {{amount}}\n• Delivery by: {{deadline}}\n• Reference: {{deal_no}}\n\nIt also sets out the full scope and deliverables, the payment schedule, revisions included, and the terms. **Keep this PDF** — it is the reference point for the whole project.\n\n## What happens next\n\n• Your advance invoice is on its way, and work begins the day it clears.\n• The remaining payment stages are already scheduled against the agreement, so there are no surprises later.\n• Progress appears in your portal as the team logs it — no need to chase us for updates.\n\nFollow it here any time:\n{{portal_url}}\n\n{{sender_name}}\nNex Desk','agreement','Sent the moment a deal is locked.'),

('invoice_sent','Invoice','🧾 Invoice {{invoice_no}} — {{currency}} {{amount}}',
E'Hi {{client_name}},\n\nInvoice {{invoice_no}} is attached.\n\n• Amount due: {{currency}} {{amount}}\n• Due date: {{due_date}}\n\nPayment details are on the invoice. **Send us the receipt once you have paid** and we will confirm the same day.\n\n{{sender_name}}\nNex Desk','invoice','Sent with every invoice.'),

('payment_received','Payment received','✅ Payment received — thank you, {{client_name}}',
E'Hi {{client_name}},\n\nYour payment of **{{currency}} {{amount}}** has been received and recorded.\n\nThe attached receipt shows the date, method, reference number and any remaining balance.\n\n{{project_name}} moves forward from here, and your next progress update will follow shortly.\n\n{{sender_name}}\nNex Desk','receipt','Sent when a payment is recorded.'),

('payment_reminder','Payment reminder','⏰ Invoice {{invoice_no}} is due on {{due_date}}',
E'Hi {{client_name}},\n\nA quick reminder that invoice {{invoice_no}} for **{{currency}} {{amount}}** is due on **{{due_date}}**.\n\nIf you have already sent it, please ignore this — payments take a day or two to appear on our side.\n\n{{sender_name}}\nNex Desk','invoice','Three days before the due date.'),

('payment_overdue','Payment overdue','⚠️ Invoice {{invoice_no}} is now past due',
E'Hi {{client_name}},\n\nInvoice {{invoice_no}} for **{{currency}} {{amount}}** was due on {{due_date}} and is still showing as unpaid.\n\nWork on {{project_name}} is paused until it clears. If something is holding it up, tell us — we would much rather agree a schedule than stop.\n\n{{sender_name}}\nNex Desk','invoice','The day after the due date.'),

('project_kickoff','Project kickoff','🚀 {{project_name}} starts now — what we need from you',
E'Hi {{client_name}},\n\nYour payment has cleared and **{{project_name}} is underway.**\n\n## What we need within three working days\n\n• Brand files: Logo in AI, SVG or high-resolution PNG\n• Content: Text for each page, or a rough draft\n• Imagery: Photographs or product images\n• Access: Domain and hosting logins\n• Accounts: Any existing analytics or social profiles to connect\n\nUpload it all in your portal — no need to email large files:\n{{portal_url}}\n\n## One more thing\n\nPlease name **one person** on your side who can approve work. Decisions by committee are the single biggest cause of missed deadlines, and holding {{deadline}} depends on quick answers.\n\n{{sender_name}}\nNex Desk', null,'Sent after the advance payment clears.'),

('progress_update','Progress update','📊 {{project_name}} — {{progress}}% complete',
E'Hi {{client_name}},\n\nHere is where {{project_name}} stands. We are at **{{progress}}% complete.**\n\n## Recent work\n\n{{recent_updates}}\n\n## Milestones\n\n{{milestone_summary}}\n\nThe attached report has the full breakdown, and live progress is always in your portal:\n{{portal_url}}\n\n{{sender_name}}\nNex Desk','progress_report','Send weekly. Recent work and milestones fill in automatically.'),

('staging_ready','Ready for review','👀 {{project_name}} is ready for your review',
E'Hi {{client_name}},\n\n{{project_name}} is on the staging link and ready for you to go through:\n\n{{staging_url}}\n\nClick everything, and **try it on your phone too.** Note anything that looks off and send it as one list rather than as you find it — that way we fix it all in a single pass.\n\nWe need your feedback within **three working days** to hold the {{deadline}} deadline.\n\n{{sender_name}}\nNex Desk', null,'Sent automatically the first time a staging URL is saved on a project. Starts the review clock.'),

('feedback_needed','Feedback needed','⏳ Waiting on your feedback for {{project_name}}',
E'Hi {{client_name}},\n\nWe are blocked on {{project_name}} until we hear back on the last round — it has been {{days_waiting}} days since we sent it over.\n\nHere it is again:\n\n{{staging_url}}\n\nWorth flagging: **the {{deadline}} deadline moves by however long we wait.** That is not a penalty, just how the schedule works.\n\nA quick "looks good" is plenty if you have no changes.\n\n{{sender_name}}\nNex Desk', null,'Sent automatically by the daily cron from three days after the staging link goes out, then weekly, three times, then it stops. A change request or a milestone approval from the client cancels it.'),

('change_order','Change order','🔁 Change to {{project_name}} — your approval needed',
E'Hi {{client_name}},\n\nWhat you have asked for sits outside the agreed scope, so here is a change order rather than a surprise on the final invoice.\n\nThe attached PDF covers:\n\n• Additional cost: {{currency}} {{amount}}\n• Also included: Exactly what is being added, and the extra time added to the deadline\n\nReply **"approved"** and we will build it. Say no and the original scope stands — no hard feelings either way.\n\n{{sender_name}}\nNex Desk','change_order','Send whenever scope grows.'),

('project_on_hold','Project on hold','⏸️ {{project_name}} is on hold',
E'Hi {{client_name}},\n\n{{project_name}} is paused as of today.\n\n**Everything completed so far is saved and nothing is lost.** Tell us when you are ready and we will pick up exactly where we stopped.\n\n{{sender_name}}\nNex Desk', null,'Sent automatically when a project status is changed to on_hold.'),

('project_delivered','Project delivered','🎉 {{project_name}} is live',
E'Hi {{client_name}},\n\n**{{project_name}} is delivered and live.**\n\n## Everything is in the attached handover\n\n• Credentials: Every login and access detail\n• Source: Where the files live\n• Guide: How to update content yourself\n• Warranty: The support period and what it covers\n\n**You own all of it outright.**

## Your warranty

Anything **broken in what we built** we fix free until **{{warranty_ends}}** — {{warranty_days}} days from today, which is when real defects surface once real people start using it.

Anything **new** is quoted first, so you know the cost before we start rather than after. Raise one from your portal any time.\n\nIt has been a pleasure working with you.\n\n{{sender_name}}\nNex Desk','handover','The final delivery email.'),

('testimonial_request','Testimonial request','⭐ Could you spare two minutes, {{client_name}}?',
E'Hi {{client_name}},\n\nNow that {{project_name}} has been running for a couple of weeks — would you write us a few lines about how it went?\n\nAnything honest is useful: what you were worried about beforehand, whether it turned out how you hoped, and whether you would work with us again.\n\nAnd if you know anyone who needs similar work, an introduction means a great deal to us.\n\n{{sender_name}}\nNex Desk', null,'Sent automatically 14 days after handover, once ever. Skipped if the client already left a testimonial.'),

('retainer_renewal','Retainer renewal','🔄 Your Nex Desk retainer renews on {{due_date}}',
E'Hi {{client_name}},\n\nYour maintenance retainer renews on **{{due_date}}** at {{currency}} {{amount}} per month.\n\nThere is nothing to do if you are happy to continue. If you would like to change the plan or stop, just reply and we will sort it.\n\n{{sender_name}}\nNex Desk','invoice','Seven days before renewal.'),

('domain_expiry','Domain or hosting expiry','🔔 Action needed — your domain expires on {{due_date}}',
E'Hi {{client_name}},\n\nYour domain and hosting expire on **{{due_date}}**.\n\nIf they lapse, your site goes offline and email stops working. Recovering an expired domain is expensive and sometimes impossible.\n\nWe can renew it for you — just say the word and we will invoice at cost.\n\n{{sender_name}}\nNex Desk', null,'Thirty and seven days before expiry.'),

('refund_cancellation','Cancellation or refund','{{project_name}} — cancellation confirmed',
E'Hi {{client_name}},\n\nConfirming that {{project_name}} is cancelled as of today.\n\nA full statement of work completed to date and any refund due to you is set out below this line by your project manager.\n\nRefunds are processed within seven working days. Every file completed so far remains available in your portal:\n{{portal_url}}\n\nIf circumstances change we would be glad to pick this back up.\n\n{{sender_name}}\nNex Desk', null,'Send on cancellation. Deliberately has no emoji — this is not a moment for one. Add the figures before sending; they are not filled in automatically.'),

('portal_invite','Client portal invite','🔑 Your Nex Desk client portal',
E'Hi {{client_name}},\n\nYou have a portal for {{project_name}} where you can follow progress, download every document and upload files to us.\n\n• Portal: {{portal_url}}\n• Email: {{client_email}}\n• Password: {{client_password}}\n\n**Please change your password after your first sign-in.**\n\n{{sender_name}}\nNex Desk', null,'Sent alongside the deal-locked email.'),

-- ── Costs paid on the client's behalf ──────────────────────────────
('client_expense_added','Cost paid on their behalf','🧾 {{category}} bought for {{project_name}} — receipt attached',
E'Hi {{client_name}},\n\nWe have bought something for {{project_name}} on your behalf, and here are the details while they are fresh.\n\n## What it is\n\n• {{category}}: {{item}}\n• Supplier: {{vendor}}\n• Bought on: {{purchased_on}}\n• Amount: {{amount}}\n\n{{charge_line}}\n\n{{details}}\n\n{{renewal_line}}\n\n{{receipt_line}}\n\nEverything we buy for you is recorded in your portal with its receipt, so you can check any charge yourself at any time:\n\n{{portal_url}}\n\nAny question at all about this, just reply.\n\n{{sender_name}}\nNex Desk', null,'Sent automatically when an expense is recorded with "Email the client" ticked.'),

('expenses_invoiced','Expenses invoiced','🧾 Invoice {{invoice_no}} — costs paid on your behalf',
E'Hi {{client_name}},\n\nInvoice {{invoice_no}} is attached. It covers things we bought for you rather than any of our own work.\n\n## What is on it\n\n{{items}}\n\n• Total: {{amount}}\n• Due: {{due_date}}\n\nEvery one of these has its receipt saved in your portal, so you can check any line against what we actually paid:\n\n{{portal_url}}\n\nIf anything on here looks wrong, tell us before you pay it and we will sort it out.\n\n{{sender_name}}\nNex Desk','invoice','Sent when unbilled extras are put on one invoice.'),

('expense_renewal','Renewal reminder','🔔 {{item}} renews on {{due_date}}',
E'Hi {{client_name}},\n\nA quick heads-up so nothing lapses without you knowing.\n\n• {{category}}: {{item}}\n• Renews on: {{due_date}}\n• Last time it cost: {{amount}}\n\n{{consequence_line}}\n\nWould you like us to renew it for you? Reply and we will handle it and invoice at cost — no markup, and the receipt goes into your portal as usual.\n\nIf you would rather take it over yourself, say so and we will send you everything you need to do it.\n\n{{sender_name}}\nNex Desk', null,'Sent by the daily cron 30, 14 and 3 days before a renewal date.')

on conflict (key) do update set
  name        = excluded.name,
  subject     = excluded.subject,
  body        = excluded.body,
  attach_doc  = excluded.attach_doc,
  description = excluded.description;
