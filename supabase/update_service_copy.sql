-- =====================================================================
-- Nex Desk Agency — Services Copy Overhaul
-- Executable SQL script for Postgres / Supabase `services` table.
-- =====================================================================

-- 1. Custom Web Applications & Sites
UPDATE services 
SET title = 'Custom Web Application & Website Development',
    long_desc = 'We design and build custom web applications and marketing websites using Next.js, React, and Supabase. Every layout is hand-coded around your actual user flows, avoiding bloated off-the-shelf page builders and unnecessary plugins.

This service is for growing businesses, startups, and service firms that have outgrown templates and need a fast, reliable web product tailored to their specific business logic and workflows.

You walk away with a clean, responsive web application hosted on your infrastructure, sub-second page loads, accessible content editing, and complete code ownership with no vendor lock-in.',
    features = ARRAY[
      'Edit content easily without paying developer fees for simple text updates',
      'Pages load in under a second so visitors never bounce due to lag',
      'Clean layouts that work smoothly on phones, tablets, and desktop screens',
      'Full ownership of all source code and assets with no recurring license lock-in',
      'Direct post-launch support and hands-on developer handoff'
    ]
WHERE slug IN ('custom-web-development', 'web-development');

-- 2. Mobile Apps
UPDATE services 
SET title = 'iOS & Android Mobile App Development',
    long_desc = 'We build cross-platform mobile applications for iOS and Android using React Native. We handle the full product build, from database integration and offline caching to push notification delivery and store submissions.

This is for teams launching a mobile product or extending an existing web platform to mobile users without doubling engineering overhead by building two separate native codebases.

You walk away with a published app on the Apple App Store and Google Play Store, automated update workflows, and clean backend data sync so your mobile app remains responsive even when users are offline.',
    features = ARRAY[
      'Single build that runs on both iPhone and Android, cutting your development cost in half',
      'Send targeted push notifications to re-engage users directly on their phone home screens',
      'App functions smoothly offline and syncs automatically when connection returns',
      'Hassle-free deployment directly to Apple App Store and Google Play accounts',
      'Secure user logins with email, password, and social account authentication'
    ]
WHERE slug = 'mobile-apps';

-- 3. Web & Product UI/UX Design
UPDATE services 
SET title = 'Web & Product UI/UX Design',
    long_desc = 'We design interface layouts, interactive prototypes, and design systems in Figma. We map out user journeys and build reusable UI components that make software intuitive to navigate and simple for developers to implement.

Perfect for founders starting a new product, or existing software platforms with confusing user flows that cause customer drop-off and support tickets.

You walk away with a complete Figma file containing click-through prototypes, mobile and desktop layouts, and a component library that matches production CSS variables for seamless development.',
    features = ARRAY[
      'Test and validate your product idea with clickable prototypes before writing code',
      'Clear layout hierarchy that helps visitors understand your offer and take action',
      'Reusable Figma component library that speeds up future feature additions',
      'Consistent typography and color rules that make your product look established',
      'Developer-ready asset exports so your engineering team builds without guessing'
    ]
WHERE slug IN ('web-design', 'ui-ux');

-- 4. Technical SEO
UPDATE services 
SET title = 'Technical SEO & Search Performance',
    long_desc = 'We fix structural, code-level, and metadata issues on your site so search engines can properly crawl, index, and rank your pages. We optimize structured data (JSON-LD), site architecture, meta tags, and page speed.

Designed for companies with solid products or services whose websites are currently invisible on Google search or losing traffic to technical indexing errors and slow page load speeds.

You walk away with a search-optimized codebase, corrected Google Search Console indexing errors, rich search snippets, and a clear baseline report tracking your organic impression growth.',
    features = ARRAY[
      'Help search engines understand your exact business offerings through schema markup',
      'Eliminate hidden site errors that prevent Google from indexing your valuable pages',
      'Faster page rendering that boosts keyword rankings and user retention',
      'Clean OpenGraph tags so shared links display proper images and titles on social platforms',
      'Transparent monthly reports showing real keyword rankings and organic traffic growth'
    ]
WHERE slug = 'seo';

-- 5. AI Integration & Workflows
UPDATE services 
SET title = 'AI Integration & Workflow Automation',
    long_desc = 'We connect AI models, data pipelines, and internal tools to automate repetitive manual tasks in your business operations. From automated document processing to intelligent email sorting and CRM updates, we write targeted automation scripts.

Built for operational teams spending dozens of hours each week on manual data entry, customer ticket categorization, lead qualification, or document summary tasks.

You walk away with working background automations integrated into your existing software stack, clear operational logs, and a custom control dashboard where your team can oversee automated jobs.',
    features = ARRAY[
      'Automate repetitive data entry tasks to save your team hours of manual work each week',
      'Extract structured information from customer emails and PDFs directly into your database',
      'Connect your internal tools so customer actions trigger instant downstream updates',
      'Custom admin interface to easily monitor, pause, or adjust automated tasks',
      'Reliable error handling so failed tasks alert your team instead of silently failing'
    ]
WHERE slug = 'ai-automation';

-- 6. E-Commerce
UPDATE services 
SET title = 'High-Performance E-Commerce Stores',
    long_desc = 'We build custom, fast online storefronts integrated with Shopify, Stripe, or local payment gateways. We focus on frictionless product discovery, instant page loading, and a clean checkout process.

Ideal for retail brands, direct-to-consumer businesses, and digital merchants looking to increase store conversion rates and escape rigid, sluggish theme templates.

You walk away with a custom online store, full inventory management synchronization, automated transaction emails, and a simplified checkout flow engineered to maximize completed purchases.',
    features = ARRAY[
      'Instant product page loads that keep shoppers browsing without waiting',
      'Streamlined checkout flow that reduces abandoned carts and increases completed sales',
      'Seamless integration with Stripe, credit card processors, and regional payment options',
      'Automatic inventory sync and customer receipt dispatches',
      'Simple admin dashboard to manage products, order statuses, and discount codes'
    ]
WHERE slug = 'ecommerce';

-- 7. Brand Identity
UPDATE services 
SET title = 'Brand Identity & Visual Style Guide',
    long_desc = 'We create visual brand systems including primary and secondary logomarks, typography rules, color palettes, and digital asset templates. We establish clear rules so your visual presence looks cohesive across web, print, and social channels.

This service is for new companies establishing their market presence or established businesses undergoing a brand refresh to reflect a more professional, premium positioning.

You walk away with vector logo files in all formats, a digital brand guidelines PDF, font pairings, color codes for web and print, and ready-to-use social media templates.',
    features = ARRAY[
      'Versatile logo system with scalable vector files for websites, social media, and print',
      'Curated color palette and typography rules that set a professional visual tone',
      'Comprehensive brand guidelines document so anyone on your team can maintain consistency',
      'Ready-to-use social media header and post templates for quick marketing collateral',
      'All master source files delivered in open vector formats for easy future editing'
    ]
WHERE slug IN ('brand-identity', 'branding');

-- 8. SaaS Multi-Tenant Platforms
UPDATE services 
SET title = 'SaaS & Web Product Engineering',
    long_desc = 'We build multi-tenant web applications with secure account separation, role-based access control, subscription billing, and user management. We construct solid database architecture and API layers designed for steady growth.

Designed for founders and product teams building software-as-a-service MVPs or internal tools that need multi-user permissions, recurring billing, and scalable database organization.

You walk away with a fully functional SaaS MVP including customer onboarding flows, Stripe billing management, role-based admin controls, and complete deployment on cloud hosting.',
    features = ARRAY[
      'Secure multi-user database architecture keeping customer data strictly separated',
      'Automated subscription billing, plan upgrades, and invoice receipts via Stripe',
      'Role-based access permissions for admins, team members, and guest users',
      'Self-service customer portal for account settings, password resets, and billing',
      'Comprehensive administrative dashboard to manage users and monitor product metrics'
    ]
WHERE slug IN ('saas-architecture', 'custom-software');

-- 9. Analytics & CRO
UPDATE services 
SET title = 'Web Analytics & Conversion Rate Optimization',
    long_desc = 'We configure Google Analytics 4, custom event tracking, conversion funnels, and user interaction heatmaps. We turn raw visitor traffic data into actionable insights so you know exactly where users drop off and how to increase conversions.

Best for marketing managers and business owners with existing website traffic who want to understand visitor behavior and improve contact form inquiries or product sales.

You walk away with verified event tracking in GA4, custom conversion dashboard views, user flow heatmaps, and a clear list of recommended UX fixes based on real user behavior.',
    features = ARRAY[
      'Track button clicks, form submissions, and sales accurately in Google Analytics 4',
      'Identify exact drop-off points in your sign-up or checkout funnel',
      'Visual heatmaps showing where visitors click, scroll, and get confused',
      'Custom dashboard view showing your key business metrics in plain English',
      'Actionable optimization recommendations prioritized by potential revenue impact'
    ]
WHERE slug = 'analytics-cro';

-- 10. API & Webhook Pipelines
UPDATE services 
SET title = 'API & Third-Party System Integration',
    long_desc = 'We build custom API connections, webhook processors, and data sync background services between your web platforms and third-party tools like CRMs, payment gateways, accounting software, and marketing platforms.

For companies whose software systems don''t talk to each other, resulting in manual data copying, missed lead notifications, or inconsistent records across tools.

You walk away with automated data pipelines running reliably between your applications, automatic retry handling for failed network requests, and clear logging for peace of mind.',
    features = ARRAY[
      'Synchronize customer and sales data automatically across your software tools',
      'Instant webhook triggers that update records the second an action occurs',
      'Automatic error logging and retry mechanisms to prevent data loss during downtime',
      'Clean custom REST or GraphQL endpoints tailored to your internal business logic',
      'Thorough API documentation so future developers can easily maintain the connection'
    ]
WHERE slug = 'api-integrations';

-- 11. Performance Audit
UPDATE services 
SET title = 'Website Speed & Performance Optimization',
    long_desc = 'We audit and optimize website performance by rewriting render-blocking code, optimizing heavy images, setting up global CDN caching, and trimming bloated JavaScript bundles.

Website owners whose site loads slowly, fails Google Core Web Vitals standards, or loses mobile visitors due to laggy page rendering and heavy assets.

You walk away with significantly reduced load times, improved Google Lighthouse performance scores, optimized media assets, and a faster mobile experience for your users.',
    features = ARRAY[
      'Dramatically faster initial page rendering that keeps mobile visitors engaged',
      'Compressed web images and modern format delivery without loss of visual quality',
      'Improved Google Core Web Vitals scores that support search engine ranking',
      'Global CDN asset delivery so your site loads quickly for international visitors',
      'Before and after speed report measuring real page load improvements'
    ]
WHERE slug = 'performance-audit';

-- 12. Content Copywriting
UPDATE services 
SET title = 'Website Copywriting & Brand Messaging',
    long_desc = 'We write clear, persuasive, and jargon-free copy for websites, landing pages, and service offerings. We focus on highlighting your actual client value proposition without corporate hype or artificial buzzwords.

For business owners whose current site text sounds generic, overly technical, or fails to explain what they do clearly to prospective clients.

You walk away with complete website text structured into page sections, strong value proposition headlines, natural call-to-action prompts, and content formatted for easy web reading.',
    features = ARRAY[
      'Clear headlines that explain your core value proposition within seconds',
      'Jargon-free body copy written in a plain, confident brand voice',
      'Structured page messaging engineered to guide visitors toward contacting you',
      'SEO keyword placement naturally woven into sentences without feeling forced',
      'Ready-to-publish copy documents formatted cleanly for web layout implementation'
    ]
WHERE slug = 'content-copywriting';

-- 13. Cloud DevOps
UPDATE services 
SET title = 'Cloud Hosting & Deployment Pipeline Setup',
    long_desc = 'We set up production cloud hosting, automated deployment pipelines (CI/CD), domain DNS routing, SSL security, and automated database backups on modern cloud providers like Vercel, Supabase, and AWS.

For web teams needing a reliable deployment environment where code changes can be previewed safely and deployed to production with zero server setup headaches.

You walk away with automated deployments linked to your code repository, active SSL encryption, automated database backup schedules, and monitoring alerts for peace of mind.',
    features = ARRAY[
      'Automated deployments whenever you push code changes to GitHub',
      'Staging environments to test new features safely before going live to customers',
      'Automated daily database backups so your application data is always safe',
      'Proper SSL setup and DNS configuration for custom domain security',
      'Monitoring setup to alert team leads immediately if server errors occur'
    ]
WHERE slug IN ('cloud-devops', 'hosting-devops');

-- 14. Design System Audit
UPDATE services 
SET title = 'Design System & UI Component Audit',
    long_desc = 'We review your visual interface components and code repository to consolidate fragmented styles into a cohesive, reusable design system in Figma and React/Tailwind code.

Ideal for product teams building software with inconsistent UI patterns, duplicate styling code, or visual mismatch between design files and the live site.

You walk away with a cleaned-up component library, mapped UI tokens (colors, spacing, typography), and documented guidelines that make adding new features simple and consistent.',
    features = ARRAY[
      'Eliminate duplicate UI code and inconsistent button styles across your app',
      'Figma design tokens that match live CSS variables line for line',
      'Faster front-end development time when building future application screens',
      'Improved accessibility contrast and font readability across all devices',
      'Clear component documentation so your team builds consistent interfaces'
    ]
WHERE slug = 'design-system-audit';

-- 15. Ongoing Retainer
UPDATE services 
SET title = 'Monthly Engineering & Design Support',
    long_desc = 'We provide a dedicated allocation of engineering and design hours each month for ongoing site updates, bug fixes, feature iterations, and performance monitoring.

For business owners and product leads who need reliable technical support and steady software improvements without hiring full-time internal engineering staff.

You walk away with a dependable development partner on standby, guaranteed monthly development turnaround, transparent hour tracking, and priority response for critical issues.',
    features = ARRAY[
      'Dedicated developer hours reserved specifically for your project each month',
      'Direct access to senior engineers for quick feature updates and advice',
      'Routine security updates, package maintenance, and uptime monitoring',
      'Flexible allocation of hours between design, development, and technical SEO',
      'Transparent monthly status summaries detailing completed work and hours used'
    ]
WHERE slug IN ('ongoing-retainer', 'maintenance');

-- 16. Security & Compliance
UPDATE services 
SET title = 'Database & API Security Audit',
    long_desc = 'We review your database architecture, Row Level Security (RLS) policies, authentication endpoints, and API authorization rules to ensure user data is properly restricted and protected.

Built for SaaS founders and business applications handling sensitive customer data or multi-tenant database records where unauthorized access must be prevented.

You walk away with audited RLS policies, secured database functions, fixed API endpoint vulnerabilities, and a written report detailing implemented security fixes.',
    features = ARRAY[
      'Strict Row Level Security policies ensuring users can only access their own data',
      'Thorough check of API endpoints and database permissions to prevent data leaks',
      'Review of authentication pipelines, token storage, and session security',
      'Immediate remediation of identified permission flaws and configuration risks',
      'Comprehensive summary report documenting all security rules and access controls'
    ]
WHERE slug = 'security-compliance';

-- 17. Paid Ads
UPDATE services 
SET title = 'Paid Advertising Campaign Management',
    long_desc = 'We design, launch, and manage targeted advertising campaigns on Google, Meta, and TikTok. We focus on clear conversion metrics, cost-per-lead targets, and continuous ad creative optimization.

For businesses looking to acquire qualified customer leads or sales through paid channels without wasting ad spend on unoptimized targeting.

You walk away with structured ad campaigns, verified conversion tracking, A/B tested ad copy and graphics, and transparent weekly performance reports.',
    features = ARRAY[
      'Targeted ad creative and copy engineered to convert prospective clients',
      'Accurate conversion tracking setup so every lead and sale is attributed',
      'Regular A/B testing of ad variations to continuously lower your customer acquisition cost',
      'Clear weekly reports focusing on actual cost-per-lead and return on ad spend',
      'Direct campaign adjustments based on live performance data'
    ]
WHERE slug = 'paid-ads';

-- 18. Social Media Management
UPDATE services 
SET title = 'Social Media Strategy & Content Management',
    long_desc = 'We plan, design, write, and schedule social media content tailored to your target audience. We maintain a consistent visual grid and engage with relevant community comments to build your brand presence.

For companies that want a polished, active presence on LinkedIn, Instagram, or Twitter without sacrificing internal team bandwidth to create daily posts.

You walk away with a monthly approved content calendar, custom branded post graphics, engaging post copy, and consistent brand activity across your profile channels.',
    features = ARRAY[
      'Monthly content calendar mapped out and approved before anything goes live',
      'Custom graphics and visual assets designed in your official brand style',
      'Clear, brand-aligned post copy written to engage your target audience',
      'Timely community management and comment monitoring during business hours',
      'Monthly breakdown of reach, engagement, and follower growth trends'
    ]
WHERE slug = 'social-media';

-- 19. Video & Motion Graphics
UPDATE services 
SET title = 'Video Editing & Motion Graphics',
    long_desc = 'We edit short-form promotional videos, product explainer clips, and animated logomarks optimized for websites and social media platforms.

For brands needing clean, professional video content to explain their software product, highlight client testimonials, or run high-performing ad creative.

You walk away with edited video assets formatted for web and social specs, professional audio levelling, subtitle overlays, and animated brand intro assets.',
    features = ARRAY[
      'Crisp video editing formatted specifically for vertical reels or horizontal web player specs',
      'Subtitles and caption overlays to engage viewers watching without sound',
      'Smooth motion graphics and logo animations that elevate your production value',
      'Clear audio leveling and licensed background music integration',
      'Fast turnaround with structured feedback rounds'
    ]
WHERE slug = 'video-motion';
