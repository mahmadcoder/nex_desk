import type { Metadata } from "next";
import Link from "next/link";
import CTA from "@/components/site/CTA";
import Reveal from "@/components/site/Reveal";
import Impact from "@/components/site/Impact";
import JsonLd from "@/components/JsonLd";
import { aboutPageLd, breadcrumbLd } from "@/lib/jsonLd";
import { photos, avatar } from "@/lib/images";
import {
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Code2,
  Globe,
  FileText,
  Check,
  ExternalLink,
  Database,
  Server,
  Workflow,
  UserCheck,
  Receipt,
  Ban,
  LifeBuoy,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Ahmad Sadiq & Nex Desk — Engineering-First Software Studio",
  description:
    "Meet Ahmad Sadiq and the Nex Desk team. We are an engineering-first digital studio building sub-second web applications, SaaS MVPs, and fluid interactive experiences with zero fluff.",
  openGraph: {
    title: "About Ahmad Sadiq & Nex Desk — Engineering-First Software Studio",
    description:
      "Engineering high-performance web applications, bespoke SaaS platforms, and fluid interactive experiences with zero fluff, fixed quotes, and guaranteed delivery.",
    url: "https://nexdesk.agency/about",
  },
};

/** Core studio engineering and design specialists */
const TEAM = [
  {
    name: "Ahmad Sadiq",
    role: "Founder & Lead Solutions Architect",
    bio: "Full-stack engineer and solutions architect specializing in Next.js 15, distributed PostgreSQL architectures, and hardware-accelerated GSAP interactive experiences.",
    skills: ["Next.js 15", "TypeScript", "Supabase", "System Architecture", "GSAP 3"],
    photo: photos.founder || "/ahmad-sadiq.png",
    github: "https://github.com/mahmadcoder",
    portfolio: "https://ahmad-sadiq-pf.vercel.app/",
    isFounder: true,
  },
  {
    name: "Hamza Tariq",
    role: "Lead UI/UX & Design Systems Engineer",
    bio: "Specializes in scalable design tokens, responsive ergonomics, dark-mode design systems in Figma, and high-conversion SaaS checkout flows.",
    skills: ["Figma Systems", "UI / UX Design", "Design Tokens", "Wireframing"],
    seed: "hamza-nd",
  },
  {
    name: "Zain Ali",
    role: "Senior Full-Stack & API Engineer",
    bio: "Focused on scalable Node.js backend services, database migrations, third-party webhook integrations, and 60 FPS mobile UI performance.",
    skills: ["React & Node.js", "REST & GraphQL", "Prisma ORM", "PostgreSQL"],
    seed: "zain-nd",
  },
  {
    name: "Ayesha Khan",
    role: "Technical SEO & Search Performance Lead",
    bio: "Engineers sub-second Core Web Vitals, JSON-LD Schema structured graphs, semantic accessibility, and technical search visibility for high-growth SaaS.",
    skills: ["Core Web Vitals", "Technical SEO", "Schema.org", "Analytics & CRO"],
    seed: "ayesha-nd",
  },
];

/** The 4 Core Architectural Standards */
const ARCHITECTURAL_PILLARS = [
  {
    title: "Sub-Second Performance",
    desc: "Every site and web app is engineered for sub-second page loads (<1s) with a guaranteed 90+ Google Lighthouse score (averaging 95+). Speed directly impacts SEO, bounce rates, and revenue.",
    tag: "Speed First",
    metric: "<1s Latency",
    icon: Zap,
  },
  {
    title: "Strict Type Safety & Integrity",
    desc: "Strict TypeScript end-to-end, Supabase Row-Level Security (RLS), and ACID-compliant PostgreSQL schemas prevent regressions and protect user data.",
    tag: "Zero Tech Debt",
    metric: "100% TypeScript",
    icon: Code2,
  },
  {
    title: "100% Code & Asset Ownership",
    desc: "Zero vendor lock-in. You receive complete GitHub repository access, design source files in Figma, and full production environment keys upon final delivery.",
    tag: "Zero Lock-In",
    metric: "Full Copyright",
    icon: ShieldCheck,
  },
  {
    title: "Post-Launch Warranty & Staging",
    desc: "Transparent staging links from week one. Every project includes a complimentary 14-day post-launch warranty for bug fixes and peace of mind.",
    tag: "Guaranteed",
    metric: "14-Day Warranty",
    icon: Sparkles,
  },
];

/** Comparison: Nex Desk vs Traditional Agencies */
const COMPARISON_ROWS = [
  {
    criterion: "Direct Communication",
    traditional: "Account managers, generic helpdesks, and multiple email relays",
    freelancers: "Single point of failure, varying communication and availability",
    nexDesk: "Direct access to senior solutions architect & lead designer",
  },
  {
    criterion: "Pricing Model",
    traditional: "Vague hourly estimates with frequent budget overruns",
    freelancers: "Low upfront bid with unexpected charges added later",
    nexDesk: "100% fixed written quote with locked milestones and zero surprise billing",
  },
  {
    criterion: "Delivery Cadence",
    traditional: "3 to 6 months of corporate meetings before seeing live progress",
    freelancers: "Unpredictable timelines with potential delivery delays",
    nexDesk: "Live staging deployment in Week 1 with continuous weekly milestones",
  },
  {
    criterion: "Code Quality & Speed",
    traditional: "Bloated legacy templates, heavy plugins, high maintenance costs",
    freelancers: "Inconsistent coding standards and fragile dependencies",
    nexDesk: "Modern Next.js 15, TypeScript, Supabase, and sub-second page performance",
  },
  {
    criterion: "Asset & IP Ownership",
    traditional: "Proprietary CMS lock-in, recurring licensing, host restrictions",
    freelancers: "Often incomplete documentation or stranded credentials",
    nexDesk: "100% full ownership: GitHub repository, database, Figma, and keys transferred",
  },
];

/** 6 Guiding Agency Operating Principles */
const PRINCIPLES = [
  {
    title: "Written before verbal",
    desc: "If it isn't in the agreement, it isn't in the project. Clear scopes protect your budget as much as our timeline.",
    icon: FileText,
  },
  {
    title: "One person owns it",
    desc: "Every project has a named lead on our side. You never have to chase an unmonitored generic group inbox.",
    icon: UserCheck,
  },
  {
    title: "Scope changes are quoted",
    desc: "Extra work gets a written change order with exact cost and days before a single line of code is touched.",
    icon: Receipt,
  },
  {
    title: "You own the output",
    desc: "Source code, design files, domain records, and cloud credentials transfer immediately upon final invoice payment.",
    icon: ShieldCheck,
  },
  {
    title: "We say no to bad fits",
    desc: "If a project is outside our engineering mastery or the timeline is unrealistic, we tell you upfront rather than taking your money.",
    icon: Ban,
  },
  {
    title: "Support is real",
    desc: "Two weeks of complimentary bug-fix coverage after launch, followed by optional flexible monthly retainers.",
    icon: LifeBuoy,
  },
];

/** Company Journey Milestones */
const TIMELINE_MILESTONES = [
  {
    year: "2023",
    title: "The First Builds",
    desc: "Founded by Ahmad Sadiq delivering fast, bespoke web applications for regional businesses. Built a reputation for actually finishing on time with clean handovers.",
  },
  {
    year: "2024",
    title: "Systemized Delivery Protocols",
    desc: "Established the core Nex Desk methodology: written technical scopes, live staging deployments from week one, and zero vendor lock-in.",
  },
  {
    year: "2025",
    title: "Enterprise SaaS & Creative Motion",
    desc: "Expanded into high-scale SaaS architectures (PhysicianMeds), GPU-accelerated GSAP interactive experiences (Velvet Pour), and AI platforms (Converso AI).",
  },
  {
    year: "2026",
    title: "Unified Digital Platform",
    desc: "Serving clients worldwide across North America, Europe, the Middle East, and Asia with an integrated client portal, automated billing, and transparent project tracking.",
  },
];

/** Precision Tech Stack */
const TECH_STACK_CATEGORIES = [
  {
    category: "Frontend & Motion",
    icon: Code2,
    skills: ["Next.js 15", "React 19", "TypeScript", "TailwindCSS", "GSAP ScrollTrigger", "HTML5 Canvas"],
  },
  {
    category: "Backend & Relational DB",
    icon: Database,
    skills: ["Supabase", "PostgreSQL", "Node.js", "REST & GraphQL", "Prisma ORM", "Redis"],
  },
  {
    category: "AI & Automation",
    icon: Workflow,
    skills: ["OpenAI API", "Voice Pipelines", "LLM Prompting", "Vector Search", "Automated Workflows"],
  },
  {
    category: "Cloud & Infrastructure",
    icon: Server,
    skills: ["Vercel Edge", "Cloudflare CDN", "AWS S3 / SES", "Docker", "GitHub Actions CI/CD"],
  },
];

/** About Page Client FAQ */
const ABOUT_FAQS = [
  {
    question: "Who will actually work on my project?",
    answer:
      "You work directly with Ahmad Sadiq (Founder & Principal Architect) alongside our dedicated UI/UX and full-stack engineers. We do not pass you off to junior account executives or third-party freelancers.",
  },
  {
    question: "Do I own 100% of the code and design files?",
    answer:
      "Yes, completely. Once the final invoice is paid, full copyright and ownership of the GitHub repository, Figma source files, database schemas, and credentials transfer directly to you. Zero vendor lock-in.",
  },
  {
    question: "How do we communicate throughout the build?",
    answer:
      "We provide private Slack or WhatsApp channels for rapid async updates, weekly progress staging reviews, and live video demo calls at each milestone. You will always know the exact status of your project.",
  },
  {
    question: "Where are you based and can you work with my time zone?",
    answer:
      "Nex Desk is a remote-first studio founded in Pakistan with global operations. We work seamlessly with clients across North America (EST/PST), Europe (GMT/CET), the Middle East (GST), and Asia.",
  },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={aboutPageLd()} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />

      {/* ── 1. Hero Banner ── */}
      <section className="relative overflow-hidden py-20 lg:py-28 bg-ink-950 border-b border-ink-800">
        {/* Glow backdrop gradient */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-96 w-full max-w-7xl bg-radial-glow opacity-30 blur-3xl" />

        <div className="shell relative z-10">
          <div className="max-w-4xl">
            {/* Status Tag */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="mono-tag text-xs bg-lime-400/10 text-lime-400 px-3.5 py-1.5 rounded-full border border-lime-400/20 font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
                Engineering-First Digital Studio
              </span>
              <span className="mono-tag text-xs text-bone-300 border border-ink-600 px-3 py-1.5 rounded-full bg-ink-900/60">
                Founded by Ahmad Sadiq
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-bone-50 leading-[1.12]">
              Architecting High-Performance Digital Products That{" "}
              <span className="text-lime-400">Actually Ship.</span>
            </h1>

            <p className="mt-6 text-base sm:text-xl text-bone-200 leading-relaxed max-w-3xl">
              Nex Desk is an engineering-first software studio. We design, build, and deploy
              sub-second web applications, SaaS MVPs, and fluid interactive platforms for founders
              and ambitious brands worldwide — with zero fluff, fixed quotes, and guaranteed delivery.
            </p>

            {/* Quick CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/work"
                className="btn btn-primary h-12 px-7 text-sm font-semibold cursor-pointer inline-flex items-center gap-2"
              >
                Explore Shipped Work <ArrowRight size={16} />
              </Link>
              <Link
                href="/contact"
                className="btn h-12 px-7 text-sm text-bone-200 border-ink-600 bg-ink-900 hover:text-bone-50 cursor-pointer"
              >
                Book a Free Discovery Call
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 pt-8 border-t border-ink-800">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-lime-400">30+</p>
                <p className="mono-tag text-xs text-bone-400 mt-1">Shipped Builds</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-bone-50">100%</p>
                <p className="mono-tag text-xs text-bone-400 mt-1">Code & IP Ownership</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-sky-400">&lt;1s</p>
                <p className="mono-tag text-xs text-bone-400 mt-1">Load Latency</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-400">Fixed</p>
                <p className="mono-tag text-xs text-bone-400 mt-1">Price Guarantee</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Founder's Note & Personal Commitment ── */}
      <section className="shell py-20 lg:py-24">
        <Reveal className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Founder Photo & Visual Card */}
          <div className="card overflow-hidden border-lime-400/30 bg-ink-900 p-6 relative">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-ink-700 bg-ink-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos.founder || "/ahmad-sadiq.png"}
                alt="Ahmad Sadiq — Founder & Lead Solutions Architect at Nex Desk"
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent" />

              <div className="absolute bottom-4 inset-x-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-bold text-bone-50">Ahmad Sadiq</p>
                    <p className="mono-tag text-[11px] text-lime-400">Founder & Principal Architect</p>
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Online
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-ink-800 text-xs">
              <a
                href="https://github.com/mahmadcoder"
                target="_blank"
                rel="noreferrer"
                className="text-bone-400 hover:text-lime-400 transition-colors inline-flex items-center gap-1 font-mono"
              >
                GitHub: mahmadcoder <ArrowUpRight size={13} />
              </a>
              <a
                href="https://ahmad-sadiq-pf.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="text-bone-400 hover:text-lime-400 transition-colors inline-flex items-center gap-1 font-mono"
              >
                Personal Portfolio <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Letter from Founder */}
          <div className="space-y-6">
            <div>
              <span className="mono-tag text-lime-400 bg-lime-400/10 px-3 py-1 rounded-full border border-lime-400/20 inline-flex items-center gap-1.5">
                <FileText size={13} /> The Nex Desk Manifesto
              </span>
              <h2 className="mt-4 text-2xl sm:text-4xl font-bold text-bone-50 leading-tight">
                Why I started Nex Desk differently.
              </h2>
            </div>

            <div className="space-y-4 text-base leading-relaxed text-bone-300">
              <p>
                I founded Nex Desk out of frustration with how typical digital agencies operate. Too
                much agency work stops at the final invoice: a client pays tens of thousands of
                dollars for a site built on bloated plugins, slow server code, and generic themes —
                only to be left stranded with technical debt when things break.
              </p>
              <p>
                At Nex Desk, we operate on a fundamentally different standard. Everything we build is
                written down in a binding technical proposal before a single line of code is written.
                You get a private staging link in Week 1, not a surprise reveal at the end of the
                project.
              </p>
              <p>
                Most importantly: you speak directly to the engineers actually architecting your
                product. There are no junior account managers or sales pitches standing between you
                and the code. And when we ship, you own all of it — repository, Figma files, database,
                and credentials.
              </p>
            </div>

            <div className="pt-2">
              <p className="text-base font-semibold text-bone-100">Ahmad Sadiq</p>
              <p className="mono-tag text-xs text-lime-400 mt-0.5">Founder & Solutions Architect, Nex Desk</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── 3. Four Core Architectural Standards (Pillars) ── */}
      <section className="shell py-16 border-t border-ink-800">
        <div className="max-w-2xl mb-12">
          <p className="drawer-label">Our Standards</p>
          <h2 className="mt-4 text-2xl sm:text-3xl font-semibold text-bone-50">
            Engineered for reliability, zero tech debt, and long-term scale.
          </h2>
        </div>

        <Reveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ARCHITECTURAL_PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="card p-7 border-ink-700 bg-ink-900 flex flex-col justify-between hover:border-lime-400/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <span className="mono-tag text-[10px] text-lime-400">{p.tag}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-bone-50">{p.title}</h3>
                  <p className="mt-3 text-xs leading-relaxed text-bone-300">{p.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-ink-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-bone-400">Benchmark</span>
                  <span className="text-lime-400 font-bold">{p.metric}</span>
                </div>
              </div>
            );
          })}
        </Reveal>
      </section>

      {/* ── 4. Nex Desk vs Traditional Agencies Comparison Table ── */}
      <section className="shell py-20 border-t border-ink-800">
        <div className="max-w-3xl mb-12">
          <p className="drawer-label">The Studio Advantage</p>
          <h2 className="mt-4 text-2xl sm:text-3xl font-semibold text-bone-50">
            Why high-growth founders choose Nex Desk over bloated agencies.
          </h2>
          <p className="mt-3 text-sm text-bone-300">
            Compare our lean, engineering-first delivery model against traditional corporate agencies
            and fragmented freelance marketplaces.
          </p>
        </div>

        <Reveal className="overflow-x-auto rounded-2xl border border-ink-700 bg-ink-900">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink-700 bg-ink-950 text-xs text-bone-400 font-mono">
                <th className="py-4 px-6 font-medium">Criteria</th>
                <th className="py-4 px-6 font-medium text-red-400/80">Traditional Agencies</th>
                <th className="py-4 px-6 font-medium text-amber-400/80">Freelance Marketplaces</th>
                <th className="py-4 px-6 font-medium text-lime-400 bg-lime-400/5">
                  Nex Desk Studio
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800 text-xs">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.criterion} className="hover:bg-ink-850/50 transition-colors">
                  <td className="py-4 px-6 font-medium text-bone-100 whitespace-nowrap">
                    {row.criterion}
                  </td>
                  <td className="py-4 px-6 text-bone-400">{row.traditional}</td>
                  <td className="py-4 px-6 text-bone-400">{row.freelancers}</td>
                  <td className="py-4 px-6 font-medium text-lime-400 bg-lime-400/5">
                    <span className="inline-flex items-center gap-1.5">
                      <Check size={14} className="text-lime-400 shrink-0" />
                      {row.nexDesk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </section>

      {/* ── 5. How We Work (6 Agency Principles) ── */}
      <section className="shell py-20 border-t border-ink-800">
        <p className="drawer-label">How We Work</p>
        <h2 className="mt-4 text-2xl sm:text-3xl font-semibold text-bone-50">
          Six rules we follow on every single build.
        </h2>

        <Reveal className="mt-12 grid gap-px overflow-hidden rounded-xl border border-ink-700 bg-ink-700 md:grid-cols-3">
          {PRINCIPLES.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="bg-ink-900 p-8 hover:bg-ink-850 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center mb-4">
                  <Icon size={18} />
                </div>
                <h3 className="text-lg font-semibold text-bone-50">{p.title}</h3>
                <p className="mt-2.5 text-xs leading-relaxed text-bone-400">{p.desc}</p>
              </div>
            );
          })}
        </Reveal>
      </section>

      {/* ── 6. The Studio Team ── */}
      <section className="shell py-20 border-t border-ink-800">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
          <div>
            <p className="drawer-label">The Studio Team</p>
            <h2 className="mt-4 text-2xl sm:text-3xl font-semibold text-bone-50">
              The engineers and designers at the desk.
            </h2>
          </div>
          <p className="text-xs text-bone-400 max-w-xs font-mono">
            A boutique studio by choice. Every project receives direct senior attention.
          </p>
        </div>

        <Reveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m) => (
            <div
              key={m.name}
              className="card overflow-hidden p-6 border-ink-700 bg-ink-900 hover:border-lime-400/40 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border border-ink-600 bg-ink-800 mb-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.photo || avatar(m.seed || m.name, "notionists")}
                    alt={m.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3 className="text-base font-semibold text-bone-50 text-center">{m.name}</h3>
                <p className="mono-tag text-[11px] text-lime-400 text-center justify-center mt-1">
                  {m.role}
                </p>
                <p className="text-xs text-bone-400 leading-relaxed mt-3 text-center">{m.bio}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-ink-800">
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {m.skills.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-ink-800 text-bone-300 border border-ink-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ── 7. Milestones & Company Journey ── */}
      <section className="shell py-20 border-t border-ink-800">
        <p className="drawer-label">Our Journey</p>
        <h2 className="mt-4 text-2xl sm:text-3xl font-semibold text-bone-50">
          From first shipped builds to global delivery.
        </h2>

        <Reveal className="mt-12 grid gap-px overflow-hidden rounded-xl border border-ink-700 bg-ink-700 md:grid-cols-4">
          {TIMELINE_MILESTONES.map((m) => (
            <div key={m.year} className="bg-ink-900 p-7 transition-colors hover:bg-ink-850">
              <span className="mono-tag text-xs text-lime-400 font-bold">{m.year}</span>
              <h3 className="mt-3 text-base font-semibold text-bone-50">{m.title}</h3>
              <p className="mt-2.5 text-xs leading-relaxed text-bone-400">{m.desc}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ── 8. The Precision Tech Stack ── */}
      <section className="shell py-20 border-t border-ink-800">
        <p className="drawer-label">The Precision Stack</p>
        <h2 className="mt-4 text-2xl sm:text-3xl font-semibold text-bone-50">
          The battle-tested technologies we reach for.
        </h2>

        <Reveal className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TECH_STACK_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.category} className="card p-6 border-ink-700 bg-ink-900">
                <div className="flex items-center gap-2.5 mb-4 text-lime-400">
                  <Icon size={18} />
                  <h3 className="text-sm font-semibold text-bone-100">{cat.category}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cat.skills.map((s) => (
                    <span
                      key={s}
                      className="text-xs font-mono px-2.5 py-1 rounded bg-ink-800 border border-ink-700 text-bone-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </Reveal>
      </section>

      {/* ── 9. Impact Section (Key Metrics) ── */}
      <Impact />

      {/* ── 10. Global Footprint & Client FAQ ── */}
      <section className="shell py-20 border-t border-ink-800">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4">
            <span className="mono-tag text-lime-400 bg-lime-400/10 px-3 py-1 rounded-full border border-lime-400/20 inline-flex items-center gap-1.5">
              <Globe size={13} /> Global Remote Studio
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-bone-50">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-bone-300 leading-relaxed">
              Transparent answers about our engineering process, intellectual property rights, and
              international collaboration.
            </p>

            <div className="card p-6 border-ink-700 bg-ink-900 mt-6 space-y-3 text-xs">
              <p className="font-semibold text-bone-100">Operating Worldwide</p>
              <p className="text-bone-400 leading-relaxed">
                Headquartered in Pakistan, collaborating across EST, PST, GMT, CET, and GST time
                zones with asynchronous milestone updates and weekly video demos.
              </p>
              <div className="pt-2 flex items-center gap-3 text-[11px] font-mono text-lime-400">
                <span>✓ Async Slack/WhatsApp</span>
                <span>✓ Weekly Staging</span>
              </div>
            </div>
          </div>

          {/* Accordion list */}
          <div className="divide-y divide-ink-700 border-y border-ink-700">
            {ABOUT_FAQS.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-medium text-bone-100 hover:text-lime-400 transition-colors">
                  {faq.question}
                  <span className="mt-0.5 shrink-0 text-lime-400 transition-transform duration-300 group-open:rotate-45 font-mono text-lg">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-bone-300 max-w-xl">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. Bottom CTA ── */}
      <CTA />
    </>
  );
}
