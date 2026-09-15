-- ==============================================================================
-- Nex Desk Agency: Seed / Update Blog Posts in Supabase
-- ==============================================================================
-- This script idempotently upserts all 8 core agency blog articles into the
-- public.posts table based on 'slug'.
-- Run this script in the Supabase SQL Editor if you wish to manage these articles
-- directly from the Admin Panel (/nx-control/blog).
-- ==============================================================================

-- 1. Ensure unique constraint on slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_slug_key'
  ) THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_slug_key UNIQUE (slug);
  END IF;
END $$;

-- 2. Upsert All 8 Articles
INSERT INTO public.posts (
  slug,
  title,
  excerpt,
  content,
  tags,
  read_minutes,
  published_at,
  cover_url,
  seo_title,
  seo_desc,
  is_published
) VALUES
(
  'healthtech-architecture-nextjs-supabase',
  'Architecting Sub-Second HealthTech Portals with Next.js 15 & Supabase',
  'How we engineered medical billing and claim workflows in PhysicianMeds to achieve sub-300ms queries, HIPAA-grade security, and 98.4% insurer acceptance without legacy bloat.',
  'Medical billing is notoriously plagued by sluggish legacy software. Practitioners routinely endure multi-minute loading screens when querying insurer records, clunky patient ledgers, and fragmented communication between clinics and clearinghouses.

When we architected the PhysicianMeds platform at Nex Desk, our goal was radical: bring modern consumer-grade speed (<300ms page transitions) and ironclad relational data security to healthcare administration.

## 1. Next.js 15 Server Components: Eliminating Client Waterfall Lag

Traditional healthcare dashboards load a blank React shell, execute several client-side GraphQL or REST requests, and render multiple spinners. In contrast, Next.js 15 Server Components execute data fetching directly on the server next to the database.

By leveraging React Server Components (RSC) and parallel data streaming (Suspense boundaries):
- The primary claim status view paints in under 280ms on initial load
- Expensive parsing of 500+ line insurer codes occurs on the server, offloading the client CPU
- Zero sensitive API tokens or secret database credentials ever reach the client browser

## 2. Supabase PostgreSQL & Row-Level Security (RLS)

In healthcare architectures, data isolation is non-negotiable. Instead of relying purely on application-level filtering where a single bug might leak patient records, we enforced database-level security using PostgreSQL Row-Level Security (RLS) policies in Supabase.

Every query automatically checks the authenticated user''s organization UUID and medical role (Admin, Physician, or Billing Specialist). Even if a malicious actor tampered with frontend requests, the database refuses to return rows that do not strictly match their tenant boundary.

## 3. Sub-Second Query Speeds via Targeted B-Tree Indexing

When querying millions of historical claim status events, unindexed tables cause catastrophic latency. We designed composite B-Tree indexes on (clinic_id, claim_status, created_at DESC) alongside partial indexes for pending insurer reimbursements.

Result: Query times dropped from 2.4 seconds on legacy servers down to 0.18 seconds in production.

## 4. Key Takeaway for Founders

You do not need monolithic, million-dollar enterprise software to achieve enterprise reliability. Modern open architectures — Next.js, Supabase, and clean TypeScript — deliver higher security, 10x faster execution, and 100% full intellectual property ownership.',
  ARRAY['Engineering', 'Architecture', 'Next.js'],
  8,
  '2026-02-14 00:00:00+00',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
  'Architecting Sub-Second HealthTech Portals — Nex Desk',
  'How we built sub-300ms claim processing and HIPAA-grade PostgreSQL security with Next.js 15 and Supabase.',
  true
),
(
  'interactive-motion-gsap-performance',
  'Achieving 60 FPS Interactive 3D Motion Without Sacrificing Lighthouse Scores',
  'Inside the creative engineering of Velvet Pour: combining GPU-accelerated GSAP ScrollTrigger timelines, HTML5 Canvas liquid reveals, and lazy asset decoding to sustain a 98/100 performance grade.',
  'Most agency websites face a painful tradeoff: either make the site static and boring to get a good Google Lighthouse score, or load 50MB of heavy 3D assets that look incredible on an M3 MacBook Pro but crawl at 12 FPS and crash on mobile phones.

For Velvet Pour, our luxury artisanal cocktail showcase, the client demanded both: sensory, hardware-accelerated motion that blows visitors away, paired with native 60 FPS fluidity and a 95+ performance grade.

## 1. The Bottleneck: Why Web Animations Stutter

Browsers animate elements across three stages: Layout, Paint, and Composite. When developers animate properties like top, left, margin, or width, the browser must recalculate the geometry of the entire DOM tree on every single frame — causing devastating frame drops (jank).

Rule #1 at Nex Desk: We only animate transform and opacity. These properties are handled directly by the GPU compositing layer without triggering CPU layout reflows.

## 2. Multi-Stage GSAP ScrollTrigger Coordination

Instead of loading full 3D models that demand multiple megabytes of WebGL textures, we orchestrated multi-stage 2.5D parallax timelines using GSAP ScrollTrigger:
- Synchronized bottle reveals tied directly to user scroll position with subtle inertial damping
- HTML5 Canvas liquid displacement transitions rendered at native device pixel ratios
- Micro-staggered typography entrances powered by SplitType text parsing

## 3. Coordinating Smooth Scroll with GSAP Ticker

To ensure buttery smooth interaction on desktop, we synchronized Lenis virtual scrolling directly with gsap.ticker:
```ts
lenis.on(''scroll'', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```
lagSmoothing(0) prevents animation jumps if the browser tab becomes temporarily inactive, ensuring that when the user resumes scrolling, the motion starts cleanly without erratic snapping.

## 4. Preserving the 98/100 Lighthouse Grade

How did we keep the site blazing fast?
- All visual assets converted to WebP with custom chroma subsampling, reducing payload by 74%
- Heavy animation canvases only mount when intersecting the viewport via IntersectionObserver
- Strict prefers-reduced-motion media query support for accessibility

The result: 180% higher session duration, zero mobile crashes, and a flawless 98/100 Lighthouse performance rating.',
  ARRAY['Design', 'Animation', 'Performance'],
  7,
  '2026-02-02 00:00:00+00',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
  'Achieving 60 FPS Interactive Motion with GSAP — Nex Desk',
  'Inside the creative engineering of Velvet Pour: GPU-accelerated motion with a 98/100 Lighthouse score.',
  true
),
(
  'voice-ai-saas-streaming-pipelines',
  'Building Voice-First AI SaaS Applications with Next.js and Real-Time LLM Pipelines',
  'Lessons from building Converso AI: engineering low-latency streaming responses, voice synthesis companion loops, and multi-tenant billing on modern open standards.',
  'Interactive conversational AI is shifting rapidly from static text chat interfaces into dynamic, real-time voice companions. However, connecting large language models to audio synthesis introduces major latency hurdles that ruin human conversational rhythm.

In our development of Converso AI — an interactive AI voice learning platform — we built a low-latency architecture capable of streaming human-like voice responses in under 600ms.

## 1. The Latency Problem in Voice AI

If a user speaks and waits 2 to 3 seconds for a response, the illusion of fluid conversation evaporates. The traditional pipeline (Transcribe → Process full response → Synthesize entire audio file → Stream) is far too slow.

To solve this, we implemented parallel chunked streaming:
- As soon as the user finishes speaking, transcription is sent in real-time
- The LLM stream begins immediately on edge runtimes using Server-Sent Events (SSE)
- The text-to-speech (TTS) engine begins synthesizing at the very first punctuation mark (. or ,) rather than waiting for the entire paragraph

## 2. Multi-Tenant Audio Caching & State Management

Voice generation can quickly become expensive if identical phrases are synthesized repeatedly. We implemented an edge Redis caching layer that hashes repeated prompt phrases and serves pre-synthesized audio buffers instantly in 40ms, cutting API operational costs by 42%.

## 3. Multi-Tenant Role Isolation with Supabase

Users customize unique voice companions with custom knowledge bases, persona guidelines, and historical subject memory. We utilized PostgreSQL vector embeddings (pgvector) within Supabase to execute fast cosine similarity searches, injecting only relevant educational context into the conversation window without exceeding token budgets.

## 4. Key Takeaway

Building an AI SaaS is no longer about slapping a basic wrapper on an API. Success demands low-latency streaming pipelines, intelligent caching, and thoughtful user ergonomics that make interactions feel immediate, intelligent, and natural.',
  ARRAY['AI', 'SaaS', 'Engineering'],
  8,
  '2026-01-24 00:00:00+00',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  'Building Voice-First AI SaaS Applications — Nex Desk',
  'Low-latency voice companion architectures with Next.js, Supabase, and streaming LLM pipelines.',
  true
),
(
  'why-we-write-scope-first',
  'Why we write the scope before we write any code',
  'The single habit that has saved more projects than any tool or framework: agreeing, in writing, exactly what''s being built before starting.',
  'Most project disputes aren''t about code quality — they''re about expectation mismatch. The client pictured a multi-tenant dashboard with custom permissions; the agency built a standard admin panel. Nobody wrote down the specifics, and both sides ended up frustrated.

At Nex Desk, we write the scope first: every single deliverable, every explicit exclusion, the exact price, the timeline, and the number of revision rounds included. You review and sign it before an editor ever opens.

## The Scope Document: A Shared Contract

Writing scope feels slow to agencies that want to get moving immediately. In practice, it is the fastest way to build software because it eliminates the mid-project friction that stalls delivery.

Our scope documents explicitly define:
- Exact page layouts and component specifications
- Technical integrations (payment gateways, CMS, authentication)
- Non-functional targets (load speed, Lighthouse score thresholds, browser support)
- Out-of-scope items so there are no midnight surprises

## How Scope Protects Your Budget

When scope is vague, changes are handled awkwardly. Either the agency eats the cost and builds resentment, or you get slapped with surprise invoices at handover.

With a clear scope document, any request outside the initial agreement triggers a transparent change order: a short PDF specifying the additional cost and timeline adjustment. You stay in 100% control of your budget at every step.

## The Handover Guarantee

Once the final milestone is reached, we check off every deliverable against the original scope document. You get a signed handover agreement PDF certifying that everything promised was delivered, along with full ownership transfers for your codebase and accounts.',
  ARRAY['Process', 'Working with us'],
  6,
  '2026-01-15 00:00:00+00',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
  'Why We Write Scope Before Code — Nex Desk',
  'How written scope agreements eliminate mid-project disputes and protect your budget.',
  true
),
(
  'fast-websites-are-a-feature',
  'A fast website is a feature, not a nice-to-have',
  'Every second your site takes to load costs you visitors. Here''s how we get real projects under a second, and why it pays for itself.',
  'Load speed isn''t vanity — it is directly tied to revenue. Industry research consistently proves that over 53% of mobile visitors abandon a site if it takes longer than three seconds to load. On standard 4G connections, many bloated agency sites routinely take six seconds or longer.

When we build web applications at Nex Desk, speed is treated as a core feature of the product, not an afterthought left for a post-launch cleanup.

## The Financial Impact of Load Speed

A one-second delay in page load time reduces conversion rates by up to 20%. If your store or service site turns over $10,000 a month, a slow front end is silently costing you thousands in leaked revenue.

Key speed metrics search engines and users evaluate:
- Largest Contentful Paint (LCP): How quickly main content appears (Target: < 1.2s)
- First Input Delay (FID) / INP: How fast the page responds to clicks (Target: < 50ms)
- Cumulative Layout Shift (CLS): Visual stability as elements load (Target: 0)

## Technical Architecture for Sub-Second Speed

We achieve sub-second speeds by making smart engineering choices from day one:
- Server-side rendering (SSR) and static generation with Next.js
- Automatic image optimization, WebP conversion, and responsive srcset attributes
- Eliminating heavy client-side libraries and unnecessary third-party tracking scripts
- Edge caching assets globally via high-speed CDNs

## Our 90+ Lighthouse Guarantee

We treat a 90+ score on Google Lighthouse as the floor, not an ambitious goal. Before any website goes live on your domain, we run automated performance audits across mobile and desktop viewpoints to ensure your site is fast out of the gate.',
  ARRAY['Performance', 'Web'],
  7,
  '2026-01-08 00:00:00+00',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  'Why Fast Websites Are a Feature — Nex Desk',
  'The direct revenue impact of sub-second load times and how we build for speed.',
  true
),
(
  'own-your-code',
  'You should own your code. All of it.',
  'Lock-in is a business model for agencies and a trap for clients. Here''s why we hand over everything, every time.',
  'Vendor lock-in is one of the dirtiest secrets in the agency business. Some agencies keep your source code in private repositories, hold your domain registrar hostage, or build on proprietary internal drag-and-drop engines so you can never leave without rebuilding from scratch.

At Nex Desk, we do the complete opposite: on final payment, 100% ownership of your source code, design assets, database, and accounts transfers to you. In writing.

## What Complete Ownership Includes

When your project is completed, you receive full administrative access to every single asset:
- Git repository access containing clean, documented source code
- High-resolution Figma design files with typography & color tokens
- Deployment pipeline configurations and server credentials
- Domain registrar, DNS settings, and SSL certificate ownership
- Database schemas and API keys

## Why Independent Codebases Win

Building on open standard frameworks (React, Next.js, Node, Supabase, Tailwind) ensures your company is never tied to a single agency or developer. Any competent engineer in the world can inspect your repository and start committing code on day one.

It isn''t just about generosity — it''s the only ethical way to build software. If the only reason a client stays with an agency is that they physically can''t leave, the agency hasn''t earned the relationship.',
  ARRAY['Process', 'Working with us', 'Ownership'],
  5,
  '2025-12-20 00:00:00+00',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
  'You Should Own Your Code: All of It — Nex Desk',
  'Why vendor lock-in hurts founders and how complete repository transfer protects your investment.',
  true
),
(
  'design-systems-that-scale',
  'How we build design systems that actually scale',
  'Why most agency design components break after six months, and how modular UI tokens keep your product consistent as it grows.',
  'Design systems are often treated as expensive 200-page guidelines that get created once and immediately collect digital dust. In practice, a bloated design system is almost as bad as no system at all.

When we design products at Nex Desk, we build light, modular UI tokens in Figma that mirror exact CSS variables in code.

## Tokens First: Typography, Color & Layout

Instead of styling elements ad-hoc, every component references central design tokens:
- Fluid typography scales (clamp()) for flawless desktop & mobile responsiveness
- Semantic color palettes tailored for light and dark modes
- Standardized spacing scales ensuring clean alignment

## Bridging Design and Code

When Figma component properties map 1-to-1 with React component props, engineering velocity doubles. Designers don''t guess pixel values, and developers don''t write custom CSS overrides. Your digital product stays consistent even as new features get added.',
  ARRAY['Design', 'UI/UX'],
  6,
  '2025-12-10 00:00:00+00',
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
  'Building Scalable Design Systems — Nex Desk',
  'Bridging Figma and React with modular UI tokens that maintain consistency as your app scales.',
  true
),
(
  'seo-engineering-for-saas',
  'SEO engineering: ranking without keyword stuffing',
  'Technical structure, automated metadata, clean semantic markup, and server-side performance that search engines reward instantly.',
  'Modern search engine optimization isn''t about spamming keywords in footer text — it is an engineering discipline. Search engines prioritize websites that render instantly, use proper HTML5 semantic hierarchy, and provide structured data.

## Technical SEO at the Core

We bake search engine visibility directly into the codebase:
- Automated OpenGraph and Twitter Card generation for social sharing
- Structured JSON-LD schema markup for rich search snippets
- Dynamic XML sitemaps and clean canonical tag generation
- Semantic HTML5 structure (<article>, <section>, <header>, <h1>-<h6>)

By treating technical SEO as a foundation rather than a plugin, your site starts indexing faster and ranking for high-intent keywords naturally.',
  ARRAY['SEO', 'Growth'],
  7,
  '2025-11-28 00:00:00+00',
  'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=1200&q=80',
  'SEO Engineering for High-Growth SaaS — Nex Desk',
  'Technical search engine optimization patterns that search engines index and rank instantly.',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  tags = EXCLUDED.tags,
  read_minutes = EXCLUDED.read_minutes,
  published_at = EXCLUDED.published_at,
  cover_url = EXCLUDED.cover_url,
  seo_title = EXCLUDED.seo_title,
  seo_desc = EXCLUDED.seo_desc,
  is_published = EXCLUDED.is_published;

-- Verification query
SELECT id, slug, title, is_published, published_at FROM public.posts ORDER BY published_at DESC;
