import type { ProcessStep, PricingTier, ServiceFaq } from "@/types/site";

/**
 * Six-step agency delivery sequence for Process.tsx
 */
export const HOMEPAGE_PROCESS_STEPS: [string, string][] = [
  ["Talk", "A call to work out what you actually need, which is often not what you first asked for."],
  ["Quote", "A written proposal with scope, price, timeline and what is excluded. No verbal estimates."],
  ["Lock", "You approve, we send a signed agreement PDF and take the advance. Work starts when it clears."],
  ["Build", "Weekly progress emails and a staging link. You can see it as it happens, not at the end."],
  ["Ship", "Launch, handover document, all credentials transferred. You own everything."],
  ["Stay", "One month free support, then an optional retainer for updates and monitoring."],
];

/**
 * Agency core disciplines for Studio.tsx
 */
export interface StudioDiscipline {
  key: string;
  label: string;
  line: string;
  points: string[];
  href: string;
  visualType: "design" | "build" | "launch" | "grow";
}

export const STUDIO_DISCIPLINES: Omit<StudioDiscipline, "visualType">[] = [
  {
    key: "design",
    label: "Strategy & design",
    line: "Brand, UX and interfaces designed around what your customer is trying to do.",
    points: ["Brand & identity systems", "UX research and flows", "High-fidelity UI in Figma"],
    href: "/services/web-design",
  },
  {
    key: "build",
    label: "Web & app build",
    line: "Fast, secure sites, web apps and mobile apps built to your exact spec.",
    points: ["Next.js & React web apps", "iOS / Android from one codebase", "Custom CMS & admin panels"],
    href: "/services/web-development",
  },
  {
    key: "launch",
    label: "Launch & handover",
    line: "Deployment, domains and a handover pack that transfers everything to you.",
    points: ["CI/CD & cloud setup", "Signed agreement & handover PDFs", "You own all the code"],
    href: "/services/hosting-devops",
  },
  {
    key: "grow",
    label: "Growth & SEO",
    line: "Once it's live, the SEO, ads and analytics that actually move the numbers.",
    points: ["Technical & local SEO", "Google / Meta ad campaigns", "GA4, funnels & CRO"],
    href: "/services/seo",
  },
];

/**
 * Homepage FAQ items for FaqPreview.tsx
 */
export const DEFAULT_FAQS = [
  {
    id: "1",
    question: "How do we start?",
    answer:
      "Send us a message with what you need. We reply within one working day, get on a short call, then send a written proposal with scope, price and timeline. Once you approve it, we lock the deal and send a signed agreement PDF by email.",
  },
  {
    id: "2",
    question: "What do you need from me to begin?",
    answer:
      "Your logo and brand files if you have them, your content or a rough draft of it, access to your domain and hosting, and one dedicated point of contact on your side who can approve deliverables.",
  },
  {
    id: "3",
    question: "How fast can you complete my project?",
    answer:
      "Most website and branding projects ship within 2 to 4 weeks. Custom web applications and mobile apps take 6 to 12 weeks depending on scope. We lock exact timeline milestones in writing before starting.",
  },
  {
    id: "4",
    question: "How does payment work?",
    answer:
      "Typically 50% advance to start and 50% on delivery. Larger projects can be split across key milestones. Every payment receives an automated invoice and receipt PDF with clear references.",
  },
  {
    id: "5",
    question: "What if I need something outside the agreed scope?",
    answer:
      "We issue a clear change order detailing the additional cost and timeline impact. Nothing is added silently and nothing is billed without your explicit written approval.",
  },
  {
    id: "6",
    question: "How many revisions are included?",
    answer:
      "Revisions are written directly into your agreement — usually two full rounds per deliverable. Extra rounds are billed hourly at a rate agreed upon in advance.",
  },
  {
    id: "7",
    question: "Do I own the code and design files?",
    answer:
      "Yes. Full ownership of all source code, Figma design files, graphics, and account credentials transfers entirely to you once the final payment clears.",
  },
  {
    id: "8",
    question: "What technologies do you use?",
    answer:
      "We build modern, high-performance applications using Next.js, React, React Native, TypeScript, Tailwind CSS, Node.js, and Supabase — guaranteeing 90+ Lighthouse speed scores and clean maintainable code.",
  },
  {
    id: "9",
    question: "Will my website be mobile-friendly and SEO optimized?",
    answer:
      "Absolutely. Every site we build is 100% responsive across desktop, tablet, and mobile devices, and includes complete technical on-page SEO setup, meta tags, and fast page loads.",
  },
  {
    id: "10",
    question: "What happens after launch?",
    answer:
      "You get 30 days of free post-launch support for bug fixes. After that, an optional monthly retainer covers regular updates, backups, security monitoring, and allocated development hours.",
  },
  {
    id: "11",
    question: "Can you redesign or maintain an existing project?",
    answer:
      "Yes. We frequently take over existing codebases, perform UI/UX redesigns, optimize site performance, and provide ongoing monthly maintenance and feature updates.",
  },
  {
    id: "12",
    question: "Do you work with international clients outside Pakistan?",
    answer:
      "Yes. We work seamlessly across global timezones (US, Europe, Middle East, Asia) and accept payments in USD, GBP, EUR, AED, and PKR.",
  },
];

/**
 * Ticker events for BuildTicker.tsx
 */
export type TickerKind = "signed" | "paid" | "staging" | "shipped" | "started" | "review";

export const BUILD_TICKER_EVENTS: { kind: TickerKind; text: string }[] = [
  { kind: "signed", text: "Agreement signed — e-commerce rebuild" },
  { kind: "staging", text: "Staging live — Kavi Health app" },
  { kind: "paid", text: "Payment received — Northwind" },
  { kind: "shipped", text: "Handover complete — Vertex platform" },
  { kind: "started", text: "Kickoff — SaaS billing dashboard" },
  { kind: "review", text: "Client review — Lumen brand site" },
  { kind: "staging", text: "Staging live — booking system" },
  { kind: "signed", text: "Agreement signed — mobile app build" },
  { kind: "shipped", text: "Launched — Fathom marketing site" },
  { kind: "paid", text: "Milestone paid — Orbit dashboard" },
  { kind: "started", text: "Kickoff — AI support chatbot" },
  { kind: "review", text: "Feedback approved — Práctica store" },
];

/**
 * Hotspots for TheDesk.tsx
 */
export type DeskHotspotId = "monitor" | "notebook" | "phone";

export const DESK_HOTSPOTS: { id: DeskHotspotId; label: string; href: string }[] = [
  { id: "monitor", label: "See the work", href: "/work" },
  { id: "notebook", label: "How we work", href: "/about" },
  { id: "phone", label: "Start a project", href: "/contact" },
];

/**
 * Tech stack marquee items for Marquee.tsx
 */
export const MARQUEE_STACK = [
  "Next.js", "React", "TypeScript", "Node", "Supabase", "Postgres", "Tailwind",
  "GSAP", "React Native", "Flutter", "Shopify", "WooCommerce", "Figma",
  "Google Ads", "Meta Ads", "GA4", "Vercel", "AWS", "OpenAI", "n8n", "WordPress", "SEO",
];

/**
 * Fallback 4-phase delivery steps for ServiceProcessRoadmap.tsx
 */
export const SERVICE_FALLBACK_PROCESS: ProcessStep[] = [
  {
    step_no: "01",
    title: "Discovery & System Architecture",
    description: "We analyze your project scope, wireframe application flows, map database schemas, and define tech stack milestones.",
  },
  {
    step_no: "02",
    title: "UI/UX & High-Fidelity Prototyping",
    description: "Our designers build clickable Figma design tokens, responsive layouts, and interactive component libraries for your review.",
  },
  {
    step_no: "03",
    title: "Full-Stack Production Engineering",
    description: "We code high-performance Next.js, Supabase, and TypeScript features with sub-second page speed and security controls.",
  },
  {
    step_no: "04",
    title: "QA Testing, Deployment & Handoff",
    description: "Rigorous testing, SSL setup, Vercel deployment, and 100% repository ownership handoff with post-launch support.",
  },
];

/**
 * Fallback pricing packages helper for ServicePricingTiers.tsx
 */
export function getServiceFallbackTiers(startingAt?: number): PricingTier[] {
  return [
    {
      key: "basic",
      name: "Starter Package",
      price: startingAt ? startingAt : 1500,
      price_label: startingAt ? `$${startingAt.toLocaleString()}` : "$1,500",
      short_desc: "Essential build for startups & single core product launch.",
      delivery_time: "1–2 weeks delivery",
      features: [
        "Core feature build & responsive design",
        "Sub-second page load performance",
        "Mobile & Desktop optimization",
        "100% Code & Asset ownership",
        "2 weeks post-launch support",
      ],
      is_popular: false,
      cta_text: "Select Starter Package",
    },
    {
      key: "standard",
      name: "Growth Package",
      price: startingAt ? startingAt * 2 : 3500,
      price_label: startingAt ? `$${(startingAt * 2.2).toLocaleString()}` : "$3,500",
      short_desc: "Complete production application with advanced features & integrations.",
      delivery_time: "2–4 weeks delivery",
      features: [
        "Everything in Starter Package",
        "Custom database & authentication integration",
        "Advanced admin control panel & dashboard",
        "GA4 Analytics & SEO optimization",
        "Priority API & webhook pipelines",
        "30 days dedicated warranty support",
      ],
      is_popular: true,
      cta_text: "Select Growth Package",
    },
    {
      key: "enterprise",
      name: "Enterprise Architecture",
      price: null,
      price_label: "Custom Quote",
      short_desc: "Tailored multi-team architecture, custom SLA, and dedicated engineering squad.",
      delivery_time: "Custom timeline",
      features: [
        "Everything in Growth Package",
        "Dedicated senior lead engineer & designer",
        "Multi-tenant & high-availability DB setup",
        "Security audit & SOC2 compliance prep",
        "Custom SLA & 24/7 emergency retainer",
      ],
      is_popular: false,
      cta_text: "Request Enterprise Quote",
    },
  ];
}

/**
 * Service detail fallback FAQs for ServiceFaqAccordion.tsx
 */
export function getServiceFallbackFaqs(serviceTitle: string): ServiceFaq[] {
  return [
    {
      question: `How long does delivery take for ${serviceTitle}?`,
      answer: `Most ${serviceTitle} projects ship within 2 to 4 weeks depending on scope, features, and integrations. We set clear weekly milestones so you see live progress every step of the way.`,
    },
    {
      question: "Do I get 100% code ownership and asset copyright?",
      answer: "Yes. Full ownership of all source code, Figma design files, graphics, and account credentials transfers entirely to you once the final payment clears.",
    },
    {
      question: "What happens after the project launches?",
      answer: "Every project includes 30 days of complimentary post-launch support for bug fixes. After that, an optional monthly retainer covers regular updates, security monitoring, and allocated development hours.",
    },
    {
      question: "Can I upgrade my package or request custom features during development?",
      answer: "Absolutely. We are agile and flexible. You can request scope additions at any time, and we provide transparent written estimates before building extra features.",
    },
  ];
}
