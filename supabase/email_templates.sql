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
-- Variables available:
--   {{client_name}} {{company_name}} {{project_name}} {{sender_name}}
--   {{deal_no}} {{invoice_no}} {{amount}} {{currency}} {{due_date}} {{deadline}}
--   {{progress}} {{staging_url}} {{portal_url}}
--   {{client_email}} {{client_password}}          (credential emails)
--   {{recent_updates}} {{milestone_summary}}      (progress update)
-- ============================================================

insert into email_templates (key, name, subject, body, attach_doc, description) values

('lead_autoreply','Lead auto-reply','Thanks for getting in touch, {{client_name}}',
E'Hi {{client_name}},\n\nThanks for reaching out to Nex Desk. Your enquiry has arrived and a real person is reading it — this is not an automated queue.\n\nHere is what we have on file:\n\n• Enquiry about: {{service_interest}}\n• Indicative budget: {{budget_range}}\n• Preferred timeline: {{timeline}}\n\nWhat happens next:\n\n• Within one working day we reply personally — either with answers, or with a few questions so we can scope the work properly.\n• Once we understand the requirement, you get a written quote covering the full scope, a fixed price, what is included, what is not, and a delivery timeline.\n• Nothing is committed until you approve that quote. There is no obligation at any stage.\n\nIf anything changes in the meantime, or you want to add detail, just reply to this email — it comes straight to us.\n\nYou can see recent work here:\n{{portal_url}}\n\nBest regards,\n{{sender_name}}\nNex Desk Software Agency', null,'Fires automatically the moment someone submits the contact form.'),

('quotation_sent','Quotation sent','Your quote for {{project_name}}',
E'Hi {{client_name}},\n\nHere is your quote for {{project_name}}. The attached PDF sets out the full scope, the price, what is included, what is not, and how long it will take.\n\nTotal: {{currency}} {{amount}}\n\nRead it over and tell us what you would like changed. Nothing is locked until you say so.\n\n{{sender_name}}\nNex Desk','quotation','Send before the deal is locked.'),

('quotation_followup','Quote follow-up','Any thoughts on the quote for {{project_name}}?',
E'Hi {{client_name}},\n\nJust checking in on the quote we sent for {{project_name}}.\n\nNo pressure at all. If the timing is wrong or the budget does not fit, say so and we will adjust the scope rather than push.\n\nHappy to jump on a ten-minute call if that is easier.\n\n{{sender_name}}\nNex Desk', null,'Nudge if a quote sits unsigned for five days.'),

('deal_locked','Deal confirmed','Confirmed — {{project_name}} is booked ({{deal_no}})',
E'Hi {{client_name}},\n\nWe are on. {{project_name}} is officially booked.\n\nYour agreement is attached. It covers everything we discussed:\n\n• Full scope and deliverables\n• Price: {{currency}} {{amount}}\n• Payment schedule\n• Timeline, with delivery by {{deadline}}\n• Revisions included\n• Terms and conditions\n\nKeep this PDF — it is the reference point for the whole project.\n\nNext step: your advance invoice is on its way. Work begins the day it clears.\n\nYou can follow progress any time in your portal:\n{{portal_url}}\n\n{{sender_name}}\nNex Desk','agreement','Sent the moment a deal is locked.'),

('invoice_sent','Invoice','Invoice {{invoice_no}} — {{currency}} {{amount}}',
E'Hi {{client_name}},\n\nInvoice {{invoice_no}} is attached.\n\n• Amount due: {{currency}} {{amount}}\n• Due date: {{due_date}}\n\nPayment details are on the invoice. Send us the receipt once you have paid and we will confirm the same day.\n\n{{sender_name}}\nNex Desk','invoice','Sent with every invoice.'),

('payment_received','Payment received','Payment received — thank you, {{client_name}}',
E'Hi {{client_name}},\n\nYour payment of {{currency}} {{amount}} has been received and recorded.\n\nThe attached receipt shows the date, method, reference number and any remaining balance.\n\n{{project_name}} moves forward from here, and your next progress update will follow shortly.\n\n{{sender_name}}\nNex Desk','receipt','Sent when a payment is recorded.'),

('payment_reminder','Payment reminder','Invoice {{invoice_no}} is due on {{due_date}}',
E'Hi {{client_name}},\n\nA quick reminder that invoice {{invoice_no}} for {{currency}} {{amount}} is due on {{due_date}}.\n\nIf you have already sent it, please ignore this — payments take a day or two to appear on our side.\n\n{{sender_name}}\nNex Desk','invoice','Three days before the due date.'),

('payment_overdue','Payment overdue','Invoice {{invoice_no}} is now past due',
E'Hi {{client_name}},\n\nInvoice {{invoice_no}} for {{currency}} {{amount}} was due on {{due_date}} and is still showing as unpaid.\n\nWork on {{project_name}} is paused until it clears. If something is holding it up, tell us — we would much rather agree a schedule than stop.\n\n{{sender_name}}\nNex Desk','invoice','The day after the due date.'),

('project_kickoff','Project kickoff','{{project_name}} starts now — what we need from you',
E'Hi {{client_name}},\n\nYour payment has cleared and {{project_name}} is underway.\n\nTo hold the {{deadline}} deadline, we need the following within three working days:\n\n• Logo and brand files (AI, SVG or high-resolution PNG)\n• Text content for each page, or a rough draft\n• Photographs or product images\n• Domain and hosting access\n• Any existing analytics or social accounts to connect\n\nUpload it all in your portal — no need to email large files:\n{{portal_url}}\n\nOne more thing: please name one person on your side who can approve work. Decisions by committee are the single biggest cause of missed deadlines.\n\n{{sender_name}}\nNex Desk', null,'Sent after the advance payment clears.'),

('progress_update','Progress update','{{project_name}} — {{progress}}% complete',
E'Hi {{client_name}},\n\nHere is where {{project_name}} stands. We are at {{progress}}% complete.\n\nRecent work:\n{{recent_updates}}\n\nMilestones:\n{{milestone_summary}}\n\nThe attached report has the full breakdown, and live progress is always in your portal:\n{{portal_url}}\n\n{{sender_name}}\nNex Desk','progress_report','Send weekly. Recent work and milestones fill in automatically.'),

('staging_ready','Ready for review','{{project_name}} is ready for your review',
E'Hi {{client_name}},\n\n{{project_name}} is on the staging link and ready for you to go through:\n\n{{staging_url}}\n\nClick everything, and try it on your phone too. Note anything that looks off and send it as one list rather than as you find it — that way we fix it all in a single pass.\n\nWe need your feedback within three working days to hold the {{deadline}} deadline.\n\n{{sender_name}}\nNex Desk', null,'Send when a milestone is ready for approval.'),

('feedback_needed','Feedback needed','Waiting on your feedback for {{project_name}}',
E'Hi {{client_name}},\n\nWe are blocked on {{project_name}} until we hear back on the last round.\n\nWorth flagging: the {{deadline}} deadline moves by however long we wait. That is not a penalty, just how the schedule works.\n\nA quick "looks good" is plenty if you have no changes.\n\n{{sender_name}}\nNex Desk', null,'Send when a review has been sitting untouched.'),

('change_order','Change order','Change to {{project_name}} — your approval needed',
E'Hi {{client_name}},\n\nWhat you have asked for sits outside the agreed scope, so here is a change order rather than a surprise on the final invoice.\n\nThe attached PDF covers:\n\n• Exactly what is being added\n• Additional cost: {{currency}} {{amount}}\n• Additional time added to the deadline\n\nReply "approved" and we will build it. Say no and the original scope stands — no hard feelings either way.\n\n{{sender_name}}\nNex Desk','change_order','Send whenever scope grows.'),

('project_on_hold','Project on hold','{{project_name}} is on hold',
E'Hi {{client_name}},\n\n{{project_name}} is paused as of today.\n\nEverything completed so far is saved and nothing is lost. Tell us when you are ready and we will pick up exactly where we stopped.\n\n{{sender_name}}\nNex Desk', null,'Send when a project stalls on the client side.'),

('project_delivered','Project delivered','{{project_name}} is live',
E'Hi {{client_name}},\n\n{{project_name}} is delivered and live.\n\nThe attached handover document has everything:\n\n• All login details and credentials\n• Where the source files live\n• A short guide to updating content yourself\n• The warranty period and what it covers\n• Support options from here\n\nYou own all of it outright.\n\nOne month of free bug support starts today.\n\nIt has been a pleasure working with you.\n\n{{sender_name}}\nNex Desk','handover','The final delivery email.'),

('testimonial_request','Testimonial request','Could you spare two minutes, {{client_name}}?',
E'Hi {{client_name}},\n\nNow that {{project_name}} has been running for a couple of weeks — would you write us a few lines about how it went?\n\nAnything honest is useful: what you were worried about beforehand, whether it turned out how you hoped, and whether you would work with us again.\n\nAnd if you know anyone who needs similar work, an introduction means a great deal to us.\n\n{{sender_name}}\nNex Desk', null,'Send two weeks after delivery.'),

('retainer_renewal','Retainer renewal','Your Nex Desk retainer renews on {{due_date}}',
E'Hi {{client_name}},\n\nYour maintenance retainer renews on {{due_date}} at {{currency}} {{amount}} per month.\n\nThere is nothing to do if you are happy to continue. If you would like to change the plan or stop, just reply and we will sort it.\n\n{{sender_name}}\nNex Desk','invoice','Seven days before renewal.'),

('domain_expiry','Domain or hosting expiry','Action needed — your domain expires on {{due_date}}',
E'Hi {{client_name}},\n\nYour domain and hosting expire on {{due_date}}.\n\nIf they lapse, your site goes offline and email stops working. Recovering an expired domain is expensive and sometimes impossible.\n\nWe can renew it for you — just say the word and we will invoice at cost.\n\n{{sender_name}}\nNex Desk', null,'Thirty and seven days before expiry.'),

('refund_cancellation','Cancellation or refund','{{project_name}} — cancellation confirmed',
E'Hi {{client_name}},\n\nConfirming that {{project_name}} is cancelled as of today.\n\nA full statement of work completed to date and any refund due to you is set out below this line by your project manager.\n\nRefunds are processed within seven working days. Every file completed so far remains available in your portal:\n{{portal_url}}\n\nIf circumstances change we would be glad to pick this back up.\n\n{{sender_name}}\nNex Desk', null,'Send on cancellation. Add the figures before sending — they are not filled in automatically.'),

('portal_invite','Client portal invite','Your Nex Desk client portal',
E'Hi {{client_name}},\n\nYou have a portal for {{project_name}} where you can follow progress, download every document and upload files to us.\n\n• Portal: {{portal_url}}\n• Email: {{client_email}}\n• Password: {{client_password}}\n\nPlease change your password after your first sign-in.\n\n{{sender_name}}\nNex Desk', null,'Sent alongside the deal-locked email.')

on conflict (key) do update set
  name        = excluded.name,
  subject     = excluded.subject,
  body        = excluded.body,
  attach_doc  = excluded.attach_doc,
  description = excluded.description;
