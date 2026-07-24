/**
 * Sample content so the Work and Journal pages look finished immediately,
 * before you've added anything in the admin panel. As soon as you publish real
 * case studies / posts, they take over and this is ignored automatically.
 *
 * The detail pages fall back to these when a slug isn't found in the database,
 * so every sample card is fully clickable.
 */

export type DemoCase = {
  slug: string;
  title: string;
  client_name: string;
  industry: string;
  year: string;
  outcome: string;
  challenge: string;
  solution: string;
  services: string[];
  tech_stack: string[];
  metrics: { label: string; value: string }[];
  live_url?: string;
};

export const demoCases: DemoCase[] = [
  {
    slug: "northwind-commerce",
    title: "A storefront that loads in under a second",
    client_name: "Northwind",
    industry: "E-commerce",
    year: "2025",
    outcome: "Rebuilt a slow Shopify store into a headless storefront. Conversion up 41%.",
    challenge:
      "Northwind's store took six seconds to load on mobile and lost most visitors before the page even appeared. Checkout abandonment was brutal, and the team couldn't update content without a developer.",
    solution:
      "We moved them to a headless setup — a fast custom front end with Shopify handling orders behind the scenes. Content became editable in a simple CMS, images were optimised automatically, and checkout dropped to two steps.",
    services: ["Web development", "E-commerce", "Analytics & CRO"],
    tech_stack: ["Next.js", "Shopify", "TypeScript", "Tailwind", "Vercel"],
    metrics: [
      { label: "Load time", value: "0.9s" },
      { label: "Conversion", value: "+41%" },
      { label: "Bounce rate", value: "−28%" },
    ],
    live_url: "https://example.com",
  },
  {
    slug: "kavi-health",
    title: "A booking app patients actually finish",
    client_name: "Kavi Health",
    industry: "Healthcare",
    year: "2025",
    outcome: "A cross-platform app that cut no-shows by a third with smart reminders.",
    challenge:
      "Kavi's patients booked by phone, which meant missed calls, double bookings and a receptionist buried in admin. No-shows were costing real money every week.",
    solution:
      "One app for iOS and Android from a single codebase. Patients book in three taps, get reminders they can't miss, and reschedule themselves. The clinic sees everything on a live dashboard.",
    services: ["Mobile apps", "UI/UX", "Custom software"],
    tech_stack: ["React Native", "Supabase", "Node", "Figma"],
    metrics: [
      { label: "No-shows", value: "−34%" },
      { label: "Bookings/mo", value: "2.1k" },
      { label: "App rating", value: "4.8★" },
    ],
    live_url: "https://example.com",
  },
  {
    slug: "vertex-growth",
    title: "From invisible to page one in ninety days",
    client_name: "Vertex",
    industry: "B2B SaaS",
    year: "2024",
    outcome: "A technical SEO overhaul that tripled organic traffic in one quarter.",
    challenge:
      "Vertex had a good product nobody could find. Their site was technically broken for search engines, content was thin, and paid ads were their only channel — expensive and fragile.",
    solution:
      "We fixed the technical foundation, restructured the content around what buyers actually search, and built a publishing rhythm. Organic became their biggest channel within a quarter.",
    services: ["SEO", "Content & copywriting", "Analytics & CRO"],
    tech_stack: ["Next.js", "GA4", "Ahrefs", "Search Console"],
    metrics: [
      { label: "Organic traffic", value: "3.2×" },
      { label: "Ranking keywords", value: "+480" },
      { label: "Cost per lead", value: "−52%" },
    ],
    live_url: "https://example.com",
  },
];

export type DemoPost = {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  read_minutes: number;
  published_at: string;
  content: string;
  cover_url?: string;
};

export const demoPosts: DemoPost[] = [
  {
    slug: "why-we-write-scope-first",
    title: "Why we write the scope before we write any code",
    excerpt:
      "The single habit that has saved more projects than any tool or framework: agreeing, in writing, exactly what's being built before starting.",
    tags: ["Process", "Working with us"],
    read_minutes: 6,
    published_at: "2026-01-15",
    cover_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
    content:
      "Most project disputes aren't about code quality — they're about expectation mismatch. The client pictured a multi-tenant dashboard with custom permissions; the agency built a standard admin panel. Nobody wrote down the specifics, and both sides ended up frustrated.\n\nAt Nex Desk, we write the scope first: every single deliverable, every explicit exclusion, the exact price, the timeline, and the number of revision rounds included. You review and sign it before an editor ever opens.\n\n## The Scope Document: A Shared Contract\n\nWriting scope feels slow to agencies that want to get moving immediately. In practice, it is the fastest way to build software because it eliminates the mid-project friction that stalls delivery.\n\nOur scope documents explicitly define:\n- Exact page layouts and component specifications\n- Technical integrations (payment gateways, CMS, authentication)\n- Non-functional targets (load speed, Lighthouse score thresholds, browser support)\n- Out-of-scope items so there are no midnight surprises\n\n## How Scope Protects Your Budget\n\nWhen scope is vague, changes are handled awkwardly. Either the agency eats the cost and builds resentment, or you get slapped with surprise invoices at handover.\n\nWith a clear scope document, any request outside the initial agreement triggers a transparent change order: a short PDF specifying the additional cost and timeline adjustment. You stay in 100% control of your budget at every step.\n\n## The Handover Guarantee\n\nOnce the final milestone is reached, we check off every deliverable against the original scope document. You get a signed handover agreement PDF certifying that everything promised was delivered, along with full ownership transfers for your codebase and accounts.",
  },
  {
    slug: "fast-websites-are-a-feature",
    title: "A fast website is a feature, not a nice-to-have",
    excerpt:
      "Every second your site takes to load costs you visitors. Here's how we get real projects under a second, and why it pays for itself.",
    tags: ["Performance", "Web"],
    read_minutes: 7,
    published_at: "2026-01-08",
    cover_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    content:
      "Load speed isn't vanity — it is directly tied to revenue. Industry research consistently proves that over 53% of mobile visitors abandon a site if it takes longer than three seconds to load. On standard 4G connections, many bloated agency sites routinely take six seconds or longer.\n\nWhen we build web applications at Nex Desk, speed is treated as a core feature of the product, not an afterthought left for a post-launch cleanup.\n\n## The Financial Impact of Load Speed\n\nA one-second delay in page load time reduces conversion rates by up to 20%. If your store or service site turns over $10,000 a month, a slow front end is silently costing you thousands in leaked revenue.\n\nKey speed metrics search engines and users evaluate:\n- Largest Contentful Paint (LCP): How quickly main content appears (Target: < 1.2s)\n- First Input Delay (FID) / INP: How fast the page responds to clicks (Target: < 50ms)\n- Cumulative Layout Shift (CLS): Visual stability as elements load (Target: 0)\n\n## Technical Architecture for Sub-Second Speed\n\nWe achieve sub-second speeds by making smart engineering choices from day one:\n- Server-side rendering (SSR) and static generation with Next.js\n- Automatic image optimization, WebP conversion, and responsive srcset attributes\n- Eliminating heavy client-side libraries and unnecessary third-party tracking scripts\n- Edge caching assets globally via high-speed CDNs\n\n## Our 90+ Lighthouse Guarantee\n\nWe treat a 90+ score on Google Lighthouse as the floor, not an ambitious goal. Before any website goes live on your domain, we run automated performance audits across mobile and desktop viewpoints to ensure your site is fast out of the gate.",
  },
  {
    slug: "own-your-code",
    title: "You should own your code. All of it.",
    excerpt:
      "Lock-in is a business model for agencies and a trap for clients. Here's why we hand over everything, every time.",
    tags: ["Working with us", "Ownership"],
    read_minutes: 5,
    published_at: "2025-12-20",
    cover_url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
    content:
      "Vendor lock-in is one of the dirtiest secrets in the agency business. Some agencies keep your source code in private repositories, hold your domain registrar hostage, or build on proprietary internal drag-and-drop engines so you can never leave without rebuilding from scratch.\n\nAt Nex Desk, we do the complete opposite: on final payment, 100% ownership of your source code, design assets, database, and accounts transfers to you. In writing.\n\n## What Complete Ownership Includes\n\nWhen your project is completed, you receive full administrative access to every single asset:\n- Git repository access containing clean, documented source code\n- High-resolution Figma design files with typography & color tokens\n- Deployment pipeline configurations and server credentials\n- Domain registrar, DNS settings, and SSL certificate ownership\n- Database schemas and API keys\n\n## Why Independent Codebases Win\n\nBuilding on open standard frameworks (React, Next.js, Node, Supabase, Tailwind) ensures your company is never tied to a single agency or developer. Any competent engineer in the world can inspect your repository and start committing code on day one.\n\nIt isn't just about generosity — it's the only ethical way to build software. If the only reason a client stays with an agency is that they physically can't leave, the agency hasn't earned the relationship.",
  },
  {
    slug: "design-systems-that-scale",
    title: "How we build design systems that actually scale",
    excerpt:
      "Why most agency design components break after six months, and how modular UI tokens keep your product consistent as it grows.",
    tags: ["Design", "UI/UX"],
    read_minutes: 6,
    published_at: "2025-12-10",
    cover_url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80",
    content:
      "Design systems are often treated as expensive 200-page guidelines that get created once and immediately collect digital dust. In practice, a bloated design system is almost as bad as no system at all.\n\nWhen we design products at Nex Desk, we build light, modular UI tokens in Figma that mirror exact CSS variables in code.\n\n## Tokens First: Typography, Color & Layout\n\nInstead of styling elements ad-hoc, every component references central design tokens:\n- Fluid typography scales (`clamp()`) for flawless desktop & mobile responsiveness\n- Semantic color palettes tailored for light and dark modes\n- Standardized spacing scales ensuring clean alignment\n\n## Bridging Design and Code\n\nWhen Figma component properties map 1-to-1 with React component props, engineering velocity doubles. Designers don't guess pixel values, and developers don't write custom CSS overrides. Your digital product stays consistent even as new features get added.",
  },
  {
    slug: "seo-engineering-for-saas",
    title: "SEO engineering: ranking without keyword stuffing",
    excerpt:
      "Technical structure, automated metadata, clean semantic markup, and server-side performance that search engines reward instantly.",
    tags: ["SEO", "Growth"],
    read_minutes: 7,
    published_at: "2025-11-28",
    cover_url: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=1200&q=80",
    content:
      "Modern search engine optimization isn't about spamming keywords in footer text — it is an engineering discipline. Search engines prioritize websites that render instantly, use proper HTML5 semantic hierarchy, and provide structured data.\n\n## Technical SEO at the Core\n\nWe bake search engine visibility directly into the codebase:\n- Automated OpenGraph and Twitter Card generation for social sharing\n- Structured JSON-LD schema markup for rich search snippets\n- Dynamic XML sitemaps and clean canonical tag generation\n- Semantic HTML5 structure (`<article>`, `<section>`, `<header>`, `<h1>-<h6>`)\n\nBy treating technical SEO as a foundation rather than a plugin, your site starts indexing faster and ranking for high-intent keywords naturally.",
  },
];

export type DemoService = {
  id?: string;
  slug: string;
  title: string;
  category: string;
  short_desc: string;
  long_desc?: string;
  starting_at?: number;
  currency?: string;
  features: string[];
  duration_note?: string;
  is_active?: boolean;
};

export const demoServices: DemoService[] = [
  {
    slug: "custom-web-development",
    title: "Custom Web Applications & Sites",
    category: "Web & Engineering",
    short_desc: "High-performance Next.js & React websites built for sub-second speed, conversion, and clean scalability.",
    long_desc: "We build custom web applications and marketing platforms engineered on open standards: Next.js, React, TypeScript, Supabase, and TailwindCSS. Every build includes responsive design, SEO optimization, and 100% code ownership.",
    starting_at: 1500,
    currency: "USD",
    features: ["Next.js & React Architecture", "Sub-second Load Times (<1s)", "TailwindCSS Design Tokens", "Supabase Backend & Authentication", "100% Code & Asset Ownership"],
    duration_note: "2–4 weeks delivery",
    is_active: true,
  },
  {
    slug: "mobile-apps",
    title: "iOS & Android Native Apps",
    category: "Mobile Apps",
    short_desc: "Native-grade cross-platform apps built with React Native for smooth performance on App Store and Google Play.",
    long_desc: "Single codebase for iOS and Android with zero compromise on feel or performance. Includes real-time database sync, push notifications, offline storage, and full store deployment.",
    starting_at: 2500,
    currency: "USD",
    features: ["React Native Cross-Platform Codebase", "Push Notifications & Deep Links", "Offline Storage & Real-time Sync", "App Store & Google Play Publishing"],
    duration_note: "4–6 weeks delivery",
    is_active: true,
  },
  {
    slug: "web-design",
    title: "UI/UX Design Systems",
    category: "UI/UX & Design",
    short_desc: "Pixel-perfect Figma designs, brand guidelines, and interactive prototypes built to delight users.",
    long_desc: "Design tokens in Figma that mirror exact CSS variables in code. We deliver high-fidelity wireframes, responsive UI components, user flows, and brand design guidelines.",
    starting_at: 1200,
    currency: "USD",
    features: ["Figma Design Token System", "Responsive Mobile & Desktop Layouts", "Interactive Clicking Prototypes", "Brand Guidelines & Asset Export"],
    duration_note: "1–2 weeks delivery",
    is_active: true,
  },
  {
    slug: "seo",
    title: "Technical SEO & Growth",
    category: "SEO & Marketing",
    short_desc: "Data-driven SEO overhaul and Lighthouse optimization to rank on search engines and turn traffic into clients.",
    long_desc: "Technical SEO engineering that search engines reward instantly. We fix structured data, sitemaps, OpenGraph metadata, page speed, and content taxonomy.",
    starting_at: 800,
    currency: "USD",
    features: ["Technical SEO Architecture Audit", "90+ Google Lighthouse Score", "JSON-LD Rich Snippet Schemas", "GA4 Conversion & Event Tracking"],
    duration_note: "Ongoing / 2 weeks audit",
    is_active: true,
  },
  {
    slug: "ai-automation",
    title: "AI Integration & Workflows",
    category: "AI & Automation",
    short_desc: "Connect OpenAI, custom AI agents, and automated database workflows into your business operations.",
    long_desc: "Automate repetitive manual workflows with AI. We integrate OpenAI APIs, webhooks, lead scoring, custom admin dashboards, and email dispatchers.",
    starting_at: 1800,
    currency: "USD",
    features: ["OpenAI & Custom LLM Integration", "Automated Email & Lead Workflows", "Custom Admin Dashboard Control", "API & Webhook Pipeline Connections"],
    duration_note: "2–3 weeks delivery",
    is_active: true,
  },
  {
    slug: "ecommerce",
    title: "Headless E-Commerce Stores",
    category: "E-Commerce",
    short_desc: "Ultra-fast online stores with custom frontends and Shopify or Stripe payments for maximum sales.",
    long_desc: "Convert store visitors into customers with a headless storefront. Instant page loads, 2-step checkout, and seamless inventory management.",
    starting_at: 2000,
    currency: "USD",
    features: ["Headless Shopify / Stripe Integration", "Instant Page Transitions", "Streamlined 2-Step Checkout", "Automated Inventory & Receipts"],
    duration_note: "3–5 weeks delivery",
    is_active: true,
  },
  {
    slug: "brand-identity",
    title: "Brand Identity & Styleguides",
    category: "UI/UX & Design",
    short_desc: "Complete visual identity, logo design systems, typography tokens, and brand guideline decks.",
    starting_at: 1000,
    currency: "USD",
    features: ["Primary & Secondary Logomarks", "Typography & Color Palette System", "Brand Guideline Book", "Social Media Asset Kit"],
    duration_note: "1–2 weeks delivery",
    is_active: true,
  },
  {
    slug: "saas-architecture",
    title: "SaaS Multi-Tenant Platforms",
    category: "Web & Engineering",
    short_desc: "Complete SaaS web app foundation with multi-tenancy, subscription billing, and user permissions.",
    starting_at: 3500,
    currency: "USD",
    features: ["Multi-Tenant DB Architecture", "Stripe Subscription Billing", "Role-Based Access Control", "Customer Self-Service Portal"],
    duration_note: "4–8 weeks delivery",
    is_active: true,
  },
  {
    slug: "analytics-cro",
    title: "Analytics & CRO Conversion",
    category: "SEO & Marketing",
    short_desc: "Full GA4 event tracking, conversion funnels, heatmaps, and A/B testing setup to maximize revenue.",
    starting_at: 700,
    currency: "USD",
    features: ["Custom GA4 Event Tracking", "Conversion Funnel Visualization", "Hotjar Heatmap Integration", "A/B Testing Framework Setup"],
    duration_note: "1 week delivery",
    is_active: true,
  },
  {
    slug: "api-integrations",
    title: "API & Webhook Pipeline Systems",
    category: "AI & Automation",
    short_desc: "Connect third-party APIs, CRM syncing, webhook triggers, and automated background data processing.",
    starting_at: 1200,
    currency: "USD",
    features: ["REST & GraphQL API Integrations", "Webhook Trigger Pipelines", "Background Data Processing", "Third-Party CRM & Payment Sync"],
    duration_note: "1–2 weeks delivery",
    is_active: true,
  },
  {
    slug: "performance-audit",
    title: "90+ Lighthouse Speed Boost",
    category: "Web & Engineering",
    short_desc: "Eliminate bloat, optimize images, cache assets, and boost your website speed score above 90+.",
    starting_at: 600,
    currency: "USD",
    features: ["Core Web Vitals Optimization", "Image WebP & CDN Optimization", "Bundle Size & Code Splitting", "90+ Guaranteed Lighthouse Score"],
    duration_note: "3–5 days delivery",
    is_active: true,
  },
  {
    slug: "content-copywriting",
    title: "Conversion Copy & Strategy",
    category: "SEO & Marketing",
    short_desc: "High-converting website headlines, sales copy, landing page messaging, and editorial content.",
    starting_at: 500,
    currency: "USD",
    features: ["Value Proposition Headlines", "Landing Page Sales Copy", "SEO Keyword Integration", "Clear CTAs & Tone of Voice"],
    duration_note: "1 week delivery",
    is_active: true,
  },
  {
    slug: "cloud-devops",
    title: "AWS & Vercel DevOps Setup",
    category: "Web & Engineering",
    short_desc: "Production server infrastructure, CI/CD automated deployments, custom domain DNS, and SSL security.",
    starting_at: 1500,
    currency: "USD",
    features: ["Automated CI/CD Pipelines", "Global CDN Caching", "Custom Domain & DNS Setup", "Database Backups & Monitoring"],
    duration_note: "1–2 weeks delivery",
    is_active: true,
  },
  {
    slug: "design-system-audit",
    title: "Design System Architecture",
    category: "UI/UX & Design",
    short_desc: "Audit and restructure your UI components into a clean, scalable Figma & React component library.",
    starting_at: 900,
    currency: "USD",
    features: ["Figma Component Library", "React/Tailwind Code Tokens", "Accessibility Compliance", "Documentation & Usage Guidelines"],
    duration_note: "1 week delivery",
    is_active: true,
  },
  {
    slug: "ongoing-retainer",
    title: "Dedicated Engineering Retainer",
    category: "Support & Retainers",
    short_desc: "Ongoing developer & designer hours every month for continuous updates, security, and feature builds.",
    starting_at: 2500,
    currency: "USD",
    features: ["Dedicated Monthly Dev Hours", "Priority Bug Fixes & Support", "Continuous Feature Releases", "Monthly Performance Audit"],
    duration_note: "Monthly Retainer",
    is_active: true,
  },
  {
    slug: "security-compliance",
    title: "Database Security & RLS Audit",
    category: "Support & Retainers",
    short_desc: "Security audit of your Postgres database, Supabase RLS policies, auth tokens, and API endpoints.",
    starting_at: 1100,
    currency: "USD",
    features: ["Supabase RLS Policy Audit", "Database Function Security Check", "Authentication Pipeline Review", "Vulnerability Fixes & Report"],
    duration_note: "1 week delivery",
    is_active: true,
  },
];
