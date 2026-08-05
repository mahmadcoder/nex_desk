-- ============================================================
-- NEX DESK — seed data. Run AFTER schema.sql
-- ============================================================

update settings set
  company_name = 'Nex Desk',
  tagline = 'A software agency built on shipped work.',
  email = 'ahmadsadiq.dev@gmail.com',   -- where all internal notifications go
  country = 'Pakistan',
  default_currency = 'USD',
  default_terms = E'1. Work begins once the advance payment clears.\n2. The price covers only the scope listed in this agreement. Anything outside it is quoted separately as a change order.\n3. Included revisions are listed above. Extra rounds are billed hourly.\n4. Timelines assume content, assets and feedback arrive within 3 working days of request. Delays move the deadline by the same amount.\n5. Final files, source code and credentials transfer on full payment.\n6. Nex Desk may show the finished work in its portfolio unless you ask us not to in writing.\n7. Either side may cancel with 7 days notice. Work completed to that point is payable.\n8. Third-party costs (domains, hosting, plugins, ad spend) are billed at cost and are not included.'
where id = 1;

-- ---------- SERVICES ----------------------------------------------

insert into services (slug, title, category, short_desc, icon, features, starting_at, currency, duration_note, scope_note, is_featured, sort_order) values
('web-development','Web development','Build','Fast, secure sites and web apps built to your exact spec — no page builders, no bloat.','code',
  array['Next.js / React','Custom CMS','API integrations','90+ Lighthouse scores','2 weeks free support'], 1500,'USD','2–6 weeks','Up to 5 pages, standard design', true, 1),

('web-design','Web design','Design','Interfaces designed around what your customer is trying to do, not around a template.','palette',
  array['Wireframes','High-fidelity UI','Design system','Responsive across devices','Figma handoff'], 900,'USD','1–3 weeks','Up to 5 pages, desktop + mobile', true, 2),

('seo','SEO','Growth','Technical fixes, content structure and links that move you up the results page and keep you there.','search',
  array['Technical audit','Keyword research','On-page optimisation','Local SEO / Google Business','Monthly reporting'], 400,'USD','Ongoing, monthly','One site, up to 20 pages audited', true, 3),

('paid-ads','Paid ads','Growth','Google, Meta and TikTok campaigns managed against a cost-per-lead target you agree upfront.','target',
  array['Campaign strategy','Creative + copy','Conversion tracking','A/B testing','Weekly reporting'], 500,'USD','Ongoing, monthly','One platform, ad spend billed separately', true, 4),

('mobile-apps','Mobile apps','Build','Cross-platform apps for iOS and Android from a single codebase.','smartphone',
  array['React Native / Flutter','Push notifications','Offline support','App Store submission'], 4000,'USD','6–12 weeks','Single platform, up to 10 screens', false, 5),

('ecommerce','E-commerce','Build','Stores that load fast, handle local payment methods and are easy for you to run.','shopping-cart',
  array['Shopify / WooCommerce / custom','Local payment gateways','Inventory sync','Abandoned cart recovery'], 2000,'USD','3–8 weeks','Up to 50 products, standard theme', false, 6),

('custom-software','Custom software & SaaS','Build','Internal tools, dashboards and multi-tenant products built from scratch.','server',
  array['Requirements workshop','Database design','Role-based access','Admin dashboard','Documentation'], 6000,'USD','8–20 weeks','MVP scope, single user role', false, 7),

('branding','Branding & identity','Design','Logo, colour, type and the rules for using them consistently everywhere.','sparkles',
  array['Logo system','Colour + typography','Brand guidelines PDF','Social templates','Stationery'], 700,'USD','2–4 weeks','Logo + brand guide, 2 concepts', false, 8),

('ui-ux','UI/UX & product design','Design','Research, flows and prototypes before a line of code gets written.','layers',
  array['User research','Journey mapping','Interactive prototype','Usability testing'], 1200,'USD','2–5 weeks','Up to 10 screens, one user flow', false, 9),

('social-media','Social media management','Growth','Content calendar, design, posting and community replies handled for you.','share-2',
  array['Monthly content calendar','Post design','Copywriting','Community management','Analytics'], 350,'USD','Ongoing, monthly','One platform, 12 posts/month', false, 10),

('content-copywriting','Content & copywriting','Content','Website copy, blogs and landing pages written to rank and to convert.','pen-tool',
  array['Website copy','SEO blog articles','Landing pages','Email sequences'], 300,'USD','Per project','Up to 5 pages of website copy', false, 11),

('video-motion','Video & motion graphics','Content','Ads, explainers and reels edited for the platform they run on.','film',
  array['Ad creative','Explainer videos','Reels / shorts','Logo animation','Subtitles'], 400,'USD','1–2 weeks','One 30–60s video, 2 revisions', false, 12),

('ai-automation','AI & automation','Modern','Chatbots, document processing and workflow automation that cut manual hours.','cpu',
  array['Custom AI chatbot','Document / data extraction','Workflow automation','CRM + tool integrations'], 1500,'USD','2–6 weeks','One workflow or chatbot, basic integration', true, 13),

('maintenance','Maintenance & support','Recurring','A monthly retainer covering updates, backups, monitoring and small changes.','shield',
  array['Security updates','Daily backups','Uptime monitoring','Bug fixes','Monthly change hours'], 150,'USD','Monthly retainer','One site, up to 4 change hours/month', false, 14),

('hosting-devops','Hosting & DevOps','Recurring','Deployment pipelines, servers and domains set up properly and kept running.','cloud',
  array['CI/CD pipeline','Server setup','SSL + domains','Monitoring + alerts','Disaster recovery'], 200,'USD','Monthly retainer','One app, shared hosting tier', false, 15),

('analytics-cro','Analytics & CRO','Growth','Find where visitors drop off, then fix it and prove the lift.','trending-up',
  array['GA4 + tag setup','Heatmaps + recordings','Funnel analysis','A/B testing','Dashboard'], 500,'USD','Ongoing','Initial audit + GA4 setup', false, 16)
on conflict (slug) do nothing;

-- ---------- FAQs ---------------------------------------------------

insert into faqs (question, answer, category, sort_order) values
('How do we start?','Send us a message with what you need. We reply within one working day, get on a short call, then send a written proposal with scope, price and timeline. Once you approve it we lock the deal and you get a signed agreement PDF by email.','general',1),
('What do you need from me to begin?','Your logo and brand files if you have them, your content or a rough draft of it, access to your domain and hosting, and one person on your side who can approve things.','general',2),
('How does payment work?','Typically 50% advance to start and 50% on delivery, though larger projects are split across milestones. Every payment gets an automatic receipt PDF with the date, method and reference.','payment',3),
('What if I need something outside the agreed scope?','We send a change order with the extra cost and extra days. Nothing gets added silently and nothing gets billed without your written approval.','payment',4),
('How many revisions are included?','It is written into your agreement — usually two full rounds per deliverable. Extra rounds are billed hourly at a rate you know in advance.','process',5),
('Do I own the code and design files?','Yes. Full ownership of source code, design files and credentials transfers to you once the final payment clears.','general',6),
('What happens after launch?','You get two weeks of free support for bugs. After that, an optional monthly retainer covers updates, backups, monitoring and a set number of change hours.','process',7),
('Do you work with clients outside Pakistan?','Yes. We work across timezones and invoice in PKR, USD, GBP, EUR or AED.','general',8)
on conflict do nothing;

-- ---------- EMAIL TEMPLATES ---------------------------------------
-- Moved out of this file so the copy lives in exactly ONE place:
--
--     supabase/email_templates.sql
--
-- Run that file after this one. It upserts rather than inserts, so it is also
-- how you roll out template wording changes to an existing installation.
