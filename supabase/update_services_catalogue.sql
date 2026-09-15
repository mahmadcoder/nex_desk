-- ============================================================
-- Migration 2027-37: Update Services Catalogue (Deactivate & Add New)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
-- ============================================================

-- 1. DEACTIVATE LOW-MARGIN & GENERALIST SERVICES (Hides them from site, keeps data safe)
update public.services
set is_active = false
where slug in (
  'mobile-apps',
  'branding',
  'brand-identity',
  'analytics-cro',
  'content-copywriting',
  'paid-ads',
  'social-media',
  'video-motion',
  'design-system-audit',
  'security-compliance'
);

-- 2. INSERT / UPSERT 3 HIGH-CONVERTING NEW SERVICES
insert into public.services (
  slug,
  title,
  category,
  short_desc,
  long_desc,
  features,
  starting_at,
  currency,
  duration_note,
  is_featured,
  is_active,
  sort_order
)
values
(
  'landing-page-sprint',
  '7-Day High-Converting Landing Page Sprint',
  'Web & Engineering',
  'Custom 60 FPS GSAP-animated landing page designed, coded, and launched in 7 days for product launches and waitlists.',
  'We design, code, and deploy a bespoke, high-converting landing page for your product launch, waitlist, or agency in 7 business days. Built with Next.js 15, TailwindCSS, and fluid GSAP micro-animations that captivate visitors and drive conversions.

Ideal for startup founders launching on Product Hunt or Twitter, SaaS waitlists, and businesses tired of generic, bloated WordPress templates that load slowly.

You walk away with a custom, lightning-fast landing page live on your custom domain, full waitlist/lead capture or Stripe integration, automated social sharing OpenGraph previews, and 100% full source code ownership.',
  array[
    'Custom Next.js 15 & TailwindCSS build delivered and live in 7 business days',
    'Fluid 60 FPS GSAP micro-animations that engage visitors and lower bounce rates',
    'Full waitlist capture, lead generation form, or Stripe checkout integration included',
    '100% full source code ownership with zero monthly theme or builder subscriptions',
    'Automated OpenGraph social preview images for viral Twitter and LinkedIn sharing'
  ],
  1200,
  'USD',
  '7 days delivery',
  true,
  true,
  2
),
(
  'figma-to-code',
  'Figma to Next.js & React Engineering',
  'Web & Engineering',
  'Pixel-perfect, responsive React & Next.js frontend development directly from your Figma design files.',
  'We turn your Figma design files into clean, pixel-perfect, production-grade Next.js and React code. We map your exact typography, colors, spacing, and design tokens into responsive, accessible code that works seamlessly across all devices.

Designed for digital design agencies, UI/UX freelancers, and product teams who already have beautiful Figma designs ready but need a reliable, senior frontend engineer to code them without compromises.

You walk away with a clean, modular TypeScript component architecture, fluid animations matching your design prototypes, sub-second page performance, and direct GitHub repository transfer.',
  array[
    '100% pixel-perfect translation of Figma typography, colors, and layout tokens',
    'Sub-second responsive code that looks identical across mobile, tablet, and desktop',
    'Clean, modular TypeScript and Tailwind component architecture matching your design',
    'White-label friendly: we work as your behind-the-scenes engineering partner',
    'Direct GitHub repository handover ready for instant deployment or backend hookup'
  ],
  1000,
  'USD',
  '3–5 days delivery',
  true,
  true,
  3
),
(
  'speed-optimization-sprint',
  '72-Hour Website Speed & Core Web Vitals Rescue',
  'SEO & Marketing',
  'Guaranteed 90+ Google Lighthouse score and sub-1.5s load speed for lagging Shopify, Next.js, and web stores.',
  'We take your slow, lagging website or online store and perform an intensive 72-hour performance overhaul. We eliminate render-blocking scripts, compress heavy media assets, configure edge CDN caching, and resolve Google Core Web Vitals issues.

For online stores and business websites losing sales, ad spend, and Google search ranking because pages take 4 to 6 seconds to load on mobile devices.

You walk away with a guaranteed 90+ Google Lighthouse score, sub-1.5 second page load times, passing Core Web Vitals (LCP, CLS, INP), and an authentic before-and-after audit report.',
  array[
    'Guaranteed 90+ mobile and desktop Google Lighthouse performance score',
    'Elimination of render-blocking scripts, unused CSS, and bloated JavaScript',
    'Next-generation WebP/AVIF media compression and responsive image delivery',
    'Fast global CDN asset delivery and passing Core Web Vitals (LCP, CLS, INP)',
    'Detailed before-and-after verification report proving measured speed improvements'
  ],
  700,
  'USD',
  '72 hours delivery',
  true,
  true,
  6
)
on conflict (slug) do update set
  title         = excluded.title,
  category      = excluded.category,
  short_desc    = excluded.short_desc,
  long_desc     = excluded.long_desc,
  features      = excluded.features,
  starting_at   = excluded.starting_at,
  currency      = excluded.currency,
  duration_note = excluded.duration_note,
  is_featured   = excluded.is_featured,
  is_active     = true,
  sort_order    = excluded.sort_order;
