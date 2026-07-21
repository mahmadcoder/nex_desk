-- ============================================================
-- NEX DESK — seed data. Run AFTER schema.sql
-- ============================================================

update settings set
  company_name = 'Nex Desk',
  tagline = 'A software agency built on shipped work.',
  email = 'hello@nexdesk.com',
  country = 'Pakistan',
  default_currency = 'PKR',
  default_terms = E'1. Work begins once the advance payment clears.\n2. The price covers only the scope listed in this agreement. Anything outside it is quoted separately as a change order.\n3. Included revisions are listed above. Extra rounds are billed hourly.\n4. Timelines assume content, assets and feedback arrive within 3 working days of request. Delays move the deadline by the same amount.\n5. Final files, source code and credentials transfer on full payment.\n6. Nex Desk may show the finished work in its portfolio unless you ask us not to in writing.\n7. Either side may cancel with 7 days notice. Work completed to that point is payable.\n8. Third-party costs (domains, hosting, plugins, ad spend) are billed at cost and are not included.'
where id = 1;

-- ---------- SERVICES ----------------------------------------------

insert into services (slug, title, category, short_desc, icon, features, starting_at, duration_note, is_featured, sort_order) values
('web-development','Web development','Build','Fast, secure sites and web apps built to your exact spec — no page builders, no bloat.','code',
  array['Next.js / React','Custom CMS','API integrations','90+ Lighthouse scores','1 month free support'], 80000,'2–6 weeks', true, 1),

('web-design','Web design','Design','Interfaces designed around what your customer is trying to do, not around a template.','palette',
  array['Wireframes','High-fidelity UI','Design system','Responsive across devices','Figma handoff'], 45000,'1–3 weeks', true, 2),

('seo','SEO','Growth','Technical fixes, content structure and links that move you up the results page and keep you there.','search',
  array['Technical audit','Keyword research','On-page optimisation','Local SEO / Google Business','Monthly reporting'], 35000,'Ongoing, monthly', true, 3),

('paid-ads','Paid ads','Growth','Google, Meta and TikTok campaigns managed against a cost-per-lead target you agree upfront.','target',
  array['Campaign strategy','Creative + copy','Conversion tracking','A/B testing','Weekly reporting'], 40000,'Ongoing, monthly', true, 4),

('mobile-apps','Mobile apps','Build','Cross-platform apps for iOS and Android from a single codebase.','smartphone',
  array['React Native / Flutter','Push notifications','Offline support','App Store submission'], 200000,'6–12 weeks', false, 5),

('ecommerce','E-commerce','Build','Stores that load fast, handle local payment methods and are easy for you to run.','shopping-cart',
  array['Shopify / WooCommerce / custom','Local payment gateways','Inventory sync','Abandoned cart recovery'], 120000,'3–8 weeks', false, 6),

('custom-software','Custom software & SaaS','Build','Internal tools, dashboards and multi-tenant products built from scratch.','server',
  array['Requirements workshop','Database design','Role-based access','Admin dashboard','Documentation'], 250000,'8–20 weeks', false, 7),

('branding','Branding & identity','Design','Logo, colour, type and the rules for using them consistently everywhere.','sparkles',
  array['Logo system','Colour + typography','Brand guidelines PDF','Social templates','Stationery'], 50000,'2–4 weeks', false, 8),

('ui-ux','UI/UX & product design','Design','Research, flows and prototypes before a line of code gets written.','layers',
  array['User research','Journey mapping','Interactive prototype','Usability testing'], 60000,'2–5 weeks', false, 9),

('social-media','Social media management','Growth','Content calendar, design, posting and community replies handled for you.','share-2',
  array['Monthly content calendar','Post design','Copywriting','Community management','Analytics'], 30000,'Ongoing, monthly', false, 10),

('content-copywriting','Content & copywriting','Content','Website copy, blogs and landing pages written to rank and to convert.','pen-tool',
  array['Website copy','SEO blog articles','Landing pages','Email sequences'], 25000,'Per project', false, 11),

('video-motion','Video & motion graphics','Content','Ads, explainers and reels edited for the platform they run on.','film',
  array['Ad creative','Explainer videos','Reels / shorts','Logo animation','Subtitles'], 30000,'1–2 weeks', false, 12),

('ai-automation','AI & automation','Modern','Chatbots, document processing and workflow automation that cut manual hours.','cpu',
  array['Custom AI chatbot','Document / data extraction','Workflow automation','CRM + tool integrations'], 90000,'2–6 weeks', true, 13),

('maintenance','Maintenance & support','Recurring','A monthly retainer covering updates, backups, monitoring and small changes.','shield',
  array['Security updates','Daily backups','Uptime monitoring','Bug fixes','Monthly change hours'], 15000,'Monthly retainer', false, 14),

('hosting-devops','Hosting & DevOps','Recurring','Deployment pipelines, servers and domains set up properly and kept running.','cloud',
  array['CI/CD pipeline','Server setup','SSL + domains','Monitoring + alerts','Disaster recovery'], 20000,'Monthly retainer', false, 15),

('analytics-cro','Analytics & CRO','Growth','Find where visitors drop off, then fix it and prove the lift.','trending-up',
  array['GA4 + tag setup','Heatmaps + recordings','Funnel analysis','A/B testing','Dashboard'], 35000,'Ongoing', false, 16)
on conflict (slug) do nothing;

-- ---------- FAQs ---------------------------------------------------

insert into faqs (question, answer, category, sort_order) values
('How do we start?','Send us a message with what you need. We reply within one working day, get on a short call, then send a written proposal with scope, price and timeline. Once you approve it we lock the deal and you get a signed agreement PDF by email.','general',1),
('What do you need from me to begin?','Your logo and brand files if you have them, your content or a rough draft of it, access to your domain and hosting, and one person on your side who can approve things.','general',2),
('How does payment work?','Typically 50% advance to start and 50% on delivery, though larger projects are split across milestones. Every payment gets an automatic receipt PDF with the date, method and reference.','payment',3),
('What if I need something outside the agreed scope?','We send a change order with the extra cost and extra days. Nothing gets added silently and nothing gets billed without your written approval.','payment',4),
('How many revisions are included?','It is written into your agreement — usually two full rounds per deliverable. Extra rounds are billed hourly at a rate you know in advance.','process',5),
('Do I own the code and design files?','Yes. Full ownership of source code, design files and credentials transfers to you once the final payment clears.','general',6),
('What happens after launch?','You get one month of free support for bugs. After that, an optional monthly retainer covers updates, backups, monitoring and a set number of change hours.','process',7),
('Do you work with clients outside Pakistan?','Yes. We work across timezones and invoice in PKR, USD, GBP, EUR or AED.','general',8)
on conflict do nothing;

-- ---------- EMAIL TEMPLATES ---------------------------------------
-- Variables available: {{client_name}} {{company_name}} {{project_name}}
-- {{deal_no}} {{invoice_no}} {{amount}} {{currency}} {{due_date}} {{deadline}}
-- {{progress}} {{staging_url}} {{portal_url}} {{sender_name}}

insert into email_templates (key, name, subject, body, attach_doc, description) values

('lead_autoreply','Lead auto-reply','We got your message, {{client_name}}',
E'Hi {{client_name}},\n\nThanks for reaching out to Nex Desk. Your message landed with us and a real person is reading it — not a bot queue.\n\nYou will hear back within one working day with either answers or a few questions so we can quote properly.\n\nIn the meantime, our recent work is at {{portal_url}}/work.\n\n{{sender_name}}\nNex Desk', null,'Fires automatically the moment someone submits the contact form.'),

('quotation_sent','Quotation sent','Your quote from Nex Desk — {{project_name}}',
E'Hi {{client_name}},\n\nHere is the quote for {{project_name}}. The attached PDF has the full scope, the price, what is included, what is not, and how long it will take.\n\nTotal: {{currency}} {{amount}}\n\nRead it over and tell us what you want changed. Nothing is locked until you say so.\n\n{{sender_name}}\nNex Desk','quotation','Send before the deal is locked.'),

('quotation_followup','Quote follow-up','Still thinking about {{project_name}}?',
E'Hi {{client_name}},\n\nJust checking in on the quote we sent for {{project_name}}. No pressure — if the timing is wrong or the budget does not fit, tell us and we will adjust the scope rather than push.\n\nHappy to jump on a 10 minute call if that is easier.\n\n{{sender_name}}\nNex Desk', null,'Automatic nudge if a quote sits unsigned for 5 days.'),

('deal_locked','Deal locked','Confirmed — {{project_name}} is booked ({{deal_no}})',
E'Hi {{client_name}},\n\nWe are on. {{project_name}} is officially booked.\n\nAttached is your agreement. It covers everything we discussed:\n\n• Full scope and deliverables\n• Price: {{currency}} {{amount}}\n• Payment schedule\n• Timeline and deadline: {{deadline}}\n• Revisions included\n• Terms and conditions\n\nKeep this PDF — it is the reference for the whole project.\n\nNext step: the advance invoice is on its way. Work starts the day it clears.\n\nYou can track everything at {{portal_url}}.\n\n{{sender_name}}\nNex Desk','agreement','THE main one. Sent the moment a deal is locked in admin.'),

('invoice_sent','Invoice','Invoice {{invoice_no}} — {{currency}} {{amount}}',
E'Hi {{client_name}},\n\nInvoice {{invoice_no}} is attached.\n\nAmount due: {{currency}} {{amount}}\nDue date: {{due_date}}\n\nPayment details are on the invoice. Send us the screenshot once you have paid and we will confirm the same day.\n\n{{sender_name}}\nNex Desk','invoice','Sent with every invoice.'),

('payment_received','Payment received','Payment received — thank you, {{client_name}}',
E'Hi {{client_name}},\n\nYour payment of {{currency}} {{amount}} has been received and recorded.\n\nThe attached receipt has the date, method, reference number and your remaining balance if any.\n\n{{project_name}} moves forward from here. You will get your first progress update shortly.\n\n{{sender_name}}\nNex Desk','receipt','Sent when a payment is recorded in admin.'),

('payment_reminder','Payment reminder','Reminder: invoice {{invoice_no}} is due {{due_date}}',
E'Hi {{client_name}},\n\nA friendly reminder that invoice {{invoice_no}} for {{currency}} {{amount}} is due on {{due_date}}.\n\nIf it is already sent, ignore this — payments take a day or two to show up on our side.\n\n{{sender_name}}\nNex Desk','invoice','Automatic, 3 days before due date.'),

('payment_overdue','Payment overdue','Invoice {{invoice_no}} is past due',
E'Hi {{client_name}},\n\nInvoice {{invoice_no}} for {{currency}} {{amount}} was due on {{due_date}} and is still showing unpaid.\n\nWork on {{project_name}} is paused until it clears. If something is holding it up, tell us — we would rather work out a schedule than stop.\n\n{{sender_name}}\nNex Desk','invoice','Automatic, day after due date.'),

('project_kickoff','Project kickoff','{{project_name}} starts now — here is what we need from you',
E'Hi {{client_name}},\n\nPayment cleared and {{project_name}} is underway.\n\nTo keep to the {{deadline}} deadline, we need the following within 3 working days:\n\n• Logo and brand files (AI, SVG or high-res PNG)\n• Text content for each page, or a rough draft\n• Photos or product images\n• Domain and hosting login details\n• Any existing analytics or social accounts to connect\n\nUpload it all at {{portal_url}} — no need to email large files.\n\nOne more thing: name one person on your side who can approve work. Decisions by committee are what push deadlines.\n\n{{sender_name}}\nNex Desk', null,'Sent after advance payment clears.'),

('progress_update','Progress update','{{project_name}} — {{progress}}% complete',
E'Hi {{client_name}},\n\nWeekly update on {{project_name}}. We are at {{progress}}%.\n\nDone this week:\n— \n\nUp next:\n— \n\nWaiting on you:\n— \n\nThe attached report has the full milestone breakdown and screenshots. Live progress is always at {{portal_url}}.\n\n{{sender_name}}\nNex Desk','progress_report','Send weekly. The bullet lists auto-fill from milestones.'),

('staging_ready','Ready for review','{{project_name}} is ready for your review',
E'Hi {{client_name}},\n\n{{project_name}} is on the staging link and ready for you to go through:\n\n{{staging_url}}\n\nClick everything. Try it on your phone. Note anything that looks off and send it all in one list rather than as you find it — that way we fix it in one pass.\n\nWe need your feedback within 3 working days to hold the {{deadline}} deadline.\n\n{{sender_name}}\nNex Desk', null,'Send when a milestone is ready for approval.'),

('feedback_needed','Feedback needed','Waiting on your feedback for {{project_name}}',
E'Hi {{client_name}},\n\nWe are blocked on {{project_name}} until we hear back on the last round.\n\nAs a heads up, the deadline of {{deadline}} moves by however long we wait. Not a penalty, just how the schedule works.\n\nA quick "looks good" is enough if you have no changes.\n\n{{sender_name}}\nNex Desk', null,'Send when a review has been sitting untouched.'),

('change_order','Change order','Change to {{project_name}} — approval needed',
E'Hi {{client_name}},\n\nWhat you asked for sits outside the agreed scope, so here is a change order rather than a surprise on the final invoice.\n\nAttached PDF covers:\n\n• Exactly what is being added\n• Additional cost: {{currency}} {{amount}}\n• Additional time: added to the deadline\n\nReply "approved" and we build it. Say no and the original scope stands — no hard feelings either way.\n\n{{sender_name}}\nNex Desk','change_order','Send whenever scope grows.'),

('project_on_hold','Project on hold','{{project_name}} is on hold',
E'Hi {{client_name}},\n\n{{project_name}} is paused as of today.\n\nReason:\n— \n\nEverything completed so far is saved and nothing is lost. Tell us when you are ready and we pick up where we stopped.\n\n{{sender_name}}\nNex Desk', null,'Send when a project stalls on the client side.'),

('project_delivered','Project delivered','{{project_name}} is live',
E'Hi {{client_name}},\n\n{{project_name}} is delivered and live.\n\nThe attached handover document has everything:\n\n• All login details and credentials\n• Where the source files live\n• A short guide to updating content yourself\n• Warranty period and what it covers\n• Support options from here\n\nYou own all of it outright.\n\nOne month of free bug support starts today.\n\nIt has been good working with you.\n\n{{sender_name}}\nNex Desk','handover','The final delivery email.'),

('testimonial_request','Testimonial request','Two minutes, {{client_name}}?',
E'Hi {{client_name}},\n\nNow that {{project_name}} has been running a couple of weeks — would you write us a few lines about how it went?\n\nAnything honest is useful. What you were worried about, whether it turned out how you hoped, whether you would work with us again.\n\nAnd if you know anyone who needs similar work, an introduction means a lot to us.\n\n{{sender_name}}\nNex Desk', null,'Send 2 weeks after delivery.'),

('retainer_renewal','Retainer renewal','Your Nex Desk retainer renews {{due_date}}',
E'Hi {{client_name}},\n\nYour maintenance retainer renews on {{due_date}} at {{currency}} {{amount}} per month.\n\nThis past period we handled:\n— \n\nNothing to do if you are happy to continue. If you want to change the plan or stop, just reply.\n\n{{sender_name}}\nNex Desk','invoice','Automatic, 7 days before renewal.'),

('domain_expiry','Domain or hosting expiry','Action needed: your domain expires {{due_date}}',
E'Hi {{client_name}},\n\nYour domain and hosting expire on {{due_date}}.\n\nIf these lapse your site goes offline and email stops. Recovering an expired domain is expensive and sometimes impossible.\n\nWe can renew it for you — just say the word and we will invoice at cost.\n\n{{sender_name}}\nNex Desk', null,'Automatic, 30 and 7 days before expiry.'),

('refund_cancellation','Cancellation or refund','{{project_name}} — cancellation confirmed',
E'Hi {{client_name}},\n\nConfirming that {{project_name}} is cancelled as of today.\n\nWork completed to date: {{currency}} {{amount}}\nRefund due to you: {{currency}} {{amount}}\n\nRefunds process within 7 working days. All files completed so far are attached or available at {{portal_url}}.\n\nIf circumstances change we would be glad to pick this back up.\n\n{{sender_name}}\nNex Desk', null,'Send on cancellation.'),

('portal_invite','Client portal invite','Your Nex Desk project portal',
E'Hi {{client_name}},\n\nYou have a portal for {{project_name}} where you can see progress, download every document, upload files and message the team.\n\n{{portal_url}}\n\nNo password to remember — enter your email and we send you a one-time login link.\n\n{{sender_name}}\nNex Desk', null,'Sent with the deal-locked email.')

on conflict (key) do nothing;
