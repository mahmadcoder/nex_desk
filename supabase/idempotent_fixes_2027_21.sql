-- ============================================================
-- NEX DESK — Phase 40: SaaS engineering price floor
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent — it only ever raises, never lowers)
-- ============================================================
--
-- `saas-architecture` was listed at $3,500 for four to eight weeks of
-- multi-tenant architecture, Stripe billing, role-based access and an admin
-- dashboard. That is roughly $15/hour all-in.
--
-- It also broke the pricing page against itself: the Scale tier reads
-- "$12,000+" for "full custom SaaS / platform" a few hundred pixels above the
-- per-service grid quoting the same deliverable at $3,500. Visitors anchor on
-- the smaller number.
--
-- `tierFrom()` in src/config/pricing.ts now floors each tier at the highest
-- price of the services it bundles, so this can no longer drift silently — but
-- the underlying number was wrong regardless.
--
-- The equivalent hand edit is /nx-control/services → SaaS & Web Product
-- Engineering → Starting at.

update services
   set starting_at = 6000
 where slug = 'saas-architecture'
   and (starting_at is null or starting_at < 6000);

-- Per-service tier cards on /services/[slug] derive from `starting_at`
-- (getServiceFallbackTiers), so they follow automatically — unless this service
-- has hand-written pricing_tiers, which override. Check with:
--
--   select slug, starting_at, jsonb_array_length(coalesce(pricing_tiers,'[]'::jsonb)) as custom_tiers
--     from services where slug = 'saas-architecture';
--
-- If custom_tiers > 0, edit those in the admin too or they will still show the
-- old figures.
