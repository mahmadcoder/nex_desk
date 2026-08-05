-- ============================================================
-- NEX DESK — ONE SUPPORT PERIOD, EVERYWHERE (2027-17)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_16.sql
--
-- The post-launch free-fix period is now 14 days (2 weeks) in every place it
-- is stated. Before this, the app promised four different numbers at once:
--
--   • projects.warranty_days                 — 14  (the real one)
--   • the handover EMAIL, via {{warranty_days}} — 14
--   • the handover PDF the client signs      — 30, hardcoded
--   • the public pricing page                — "1 month" / "3 months"
--
-- A client handed over yesterday holds a certificate saying 30 days and an
-- email saying 14. The code side of that is fixed in this deploy.
--
-- THIS FILE EXISTS FOR THE OTHER HALF. The public pages read these tables
-- first and fall back to src/config/siteContent.ts only when they are EMPTY
-- (faq/page.tsx:17, ServicePricingTiers.tsx:28). A production database with
-- rows in `faqs` and `services` keeps serving "30 days" after a deploy that
-- looks perfectly correct in the codebase.
--
-- Deliberately NOT re-running the CMS seed to fix this: seedFaqs/seedServices
-- upsert on question/slug, so they would overwrite every other edit made in
-- the admin panel since launch. Each statement below matches one exact phrase
-- and leaves everything else in the row untouched.
--
-- projects.warranty_days is NOT touched — its default has been 14 since
-- 2027-02 and every row already carries it. There is no data to migrate.
-- ============================================================

do $$
begin
  if to_regclass('public.faqs') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. THE STANDALONE FAQ TABLE  (/faq and the homepage preview)
-- ------------------------------------------------------------
-- Two seeded wordings have existed over the life of the site, plus the
-- pre-2027 "one month" copy from seed.sql. All three land on the same
-- sentence. replace() is a no-op on any row that does not contain the phrase,
-- so this is safe to re-run and safe on a hand-edited answer.

update public.faqs
set answer = replace(
      answer,
      '30 days of free post-launch support for bug fixes',
      '2 weeks of free post-launch support for bug fixes')
where answer like '%30 days of free post-launch support for bug fixes%';

update public.faqs
set answer = replace(
      answer,
      '30 days of complimentary post-launch support for bug fixes',
      '2 weeks of complimentary post-launch support for bug fixes')
where answer like '%30 days of complimentary post-launch support for bug fixes%';

update public.faqs
set answer = replace(
      answer,
      'one month of free support for bugs',
      'two weeks of free support for bugs')
where answer like '%one month of free support for bugs%';


-- ------------------------------------------------------------
-- 2. THE PER-SERVICE JSONB COLUMNS
-- ------------------------------------------------------------
-- pricing_tiers, faqs and process_steps are jsonb arrays edited through the
-- admin CMS. Casting the whole document to text, replacing the phrase and
-- casting back rewrites the one string wherever it sits in the structure
-- without needing to know which tier or which array index it landed in.
--
-- The phrases are distinctive enough that they cannot collide with anything
-- else in the document, and the `where` clauses mean untouched rows are not
-- rewritten at all.

do $$
begin
  if to_regclass('public.services') is null then
    raise notice 'services table not present — skipping section 2.';
    return;
  end if;

  -- Growth tier feature bullet
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'services'
               and column_name = 'pricing_tiers') then
    update public.services
    set pricing_tiers = replace(
          pricing_tiers::text,
          '30 days dedicated warranty support',
          '2 weeks dedicated warranty support')::jsonb
    where pricing_tiers::text like '%30 days dedicated warranty support%';

    update public.services
    set pricing_tiers = replace(
          pricing_tiers::text,
          '1 month free support',
          '2 weeks free support')::jsonb
    where pricing_tiers::text like '%1 month free support%';

    update public.services
    set pricing_tiers = replace(
          pricing_tiers::text,
          '3 months free support',
          '2 weeks free support')::jsonb
    where pricing_tiers::text like '%3 months free support%';
  end if;

  -- Per-service FAQ accordion
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'services'
               and column_name = 'faqs') then
    update public.services
    set faqs = replace(
          faqs::text,
          '30 days of complimentary post-launch support',
          '2 weeks of complimentary post-launch support')::jsonb
    where faqs::text like '%30 days of complimentary post-launch support%';

    update public.services
    set faqs = replace(
          faqs::text,
          '30 days of free post-launch support',
          '2 weeks of free post-launch support')::jsonb
    where faqs::text like '%30 days of free post-launch support%';
  end if;

  -- The flat `features` list on the service itself. This one is text[], NOT
  -- jsonb, so the cast-and-back trick above does not apply — each element is
  -- rewritten in place instead, which also preserves the array's ordering.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'services'
               and column_name = 'features') then
    update public.services s
    set features = (
      select array_agg(
               replace(
                 replace(
                   replace(f, '30 days dedicated warranty support', '2 weeks dedicated warranty support'),
                   '1 month free support', '2 weeks free support'),
                 '3 months free support', '2 weeks free support')
               order by ord)
      from unnest(s.features) with ordinality as t(f, ord)
    )
    where exists (
      select 1 from unnest(s.features) as f
      where f like '%30 days dedicated warranty support%'
         or f like '%1 month free support%'
         or f like '%3 months free support%'
    );
  end if;
end $$;


-- ------------------------------------------------------------
-- 3. WHAT IS LEFT SAYING SOMETHING ELSE
-- ------------------------------------------------------------
do $$
declare
  stale_faqs int;
  stale_svcs int;
  wrong_days int;
begin
  select count(*) into stale_faqs
  from public.faqs
  where answer ~* '(30 days|1 month|one month|3 months|three months).{0,40}(support|warranty)';

  -- Guarded: pricing_tiers/faqs arrive via add_service_tiers.sql and
  -- warranty_days via 2027-02, and a report must never be the thing that
  -- fails a migration on a database that has not run one of them.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'services'
               and column_name = 'pricing_tiers') then
    select count(*) into stale_svcs
    from public.services
    where coalesce(pricing_tiers::text, '') || coalesce(faqs::text, '')
          ~* '(30 days|1 month|3 months).{0,40}(support|warranty)';
  else
    stale_svcs := 0;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'projects'
               and column_name = 'warranty_days') then
    select count(*) into wrong_days
    from public.projects where coalesce(warranty_days, 14) <> 14;
  else
    wrong_days := 0;
  end if;

  raise notice '------------------------------------------------------';
  raise notice 'The free-fix period is now 14 days everywhere.';
  raise notice '';
  raise notice 'FAQ rows still naming another period     : %', stale_faqs;
  raise notice 'Service rows still naming another period : %', stale_svcs;
  raise notice 'Projects not on 14 days                  : %', wrong_days;
  raise notice '';
  if stale_faqs > 0 or stale_svcs > 0 then
    raise notice 'Those were edited by hand in the CMS, so they were left';
    raise notice 'alone on purpose. Open the admin panel and reword them,';
    raise notice 'or the site will keep promising two different periods.';
  else
    raise notice 'Nothing left to reword by hand.';
  end if;
  raise notice '';
  raise notice 'The handover PDF now reads projects.warranty_ends_on, so';
  raise notice 'reprinting a delivered certificate no longer moves the';
  raise notice 'expiry date forward. Reprint one and check it matches.';
  raise notice '------------------------------------------------------';
end $$;
