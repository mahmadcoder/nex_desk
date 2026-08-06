-- ============================================================
-- NEX DESK — SUPPORT PERIOD, SET WHERE IT IS SOLD (2027-20)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_19.sql
--
-- `projects.warranty_days` has existed since 2027-02 with a default of 14 —
-- and NOTHING in the app has ever written it. `provision.ts` creates every
-- project without mentioning the column, so every project in the system is on
-- 14 days whether that is what was sold or not. The pricing page's "2 weeks
-- free support" is prose in a config file with no link to any of this.
--
-- This adds the two columns that make the chain real:
--
--     deal_templates.warranty_days  →  the package default
--     deals.warranty_days           →  what this client actually agreed
--     projects.warranty_days        →  copied at lock, already existed
--
-- The deal is where it belongs: support is a term being sold, so it is agreed
-- and signed for rather than set quietly afterwards.
-- ============================================================

do $$
begin
  if to_regclass('public.deals') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. THE DEAL — what this client agreed to
-- ------------------------------------------------------------
alter table if exists public.deals
  add column if not exists warranty_days int not null default 14;

comment on column public.deals.warranty_days is
  'Free defect-fix days sold with this deal. Copied to projects.warranty_days when the deal is locked. 0 is valid — a fixed-scope job with no support.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'deals_warranty_days_check') then
    alter table public.deals
      add constraint deals_warranty_days_check
      check (warranty_days >= 0 and warranty_days <= 365);
  end if;
end $$;


-- ------------------------------------------------------------
-- 2. THE PACKAGE — the default a saved template carries
-- ------------------------------------------------------------
-- deal_templates already holds duration_days and revisions_included; support
-- is the same class of thing and was simply missing.
do $$
begin
  if to_regclass('public.deal_templates') is null then
    raise notice 'deal_templates not present — skipping. Run idempotent_fixes_2027_01.sql for saved packages.';
    return;
  end if;

  execute 'alter table public.deal_templates
             add column if not exists warranty_days int not null default 14';

  if not exists (select 1 from pg_constraint where conname = 'deal_templates_warranty_days_check') then
    execute 'alter table public.deal_templates
               add constraint deal_templates_warranty_days_check
               check (warranty_days >= 0 and warranty_days <= 365)';
  end if;
end $$;


-- ------------------------------------------------------------
-- 3. BACKFILL LOCKED DEALS FROM THEIR PROJECTS
-- ------------------------------------------------------------
-- Every existing project is on 14 (the default nothing ever changed), so this
-- is a no-op today. It exists so the two columns cannot disagree if a project
-- was ever edited directly in the database.
update public.deals d
set    warranty_days = p.warranty_days
from   public.projects p
where  p.deal_id = d.id
  and  p.warranty_days is not null
  and  d.warranty_days <> p.warranty_days;


-- ------------------------------------------------------------
-- 4. WHERE THINGS STAND
-- ------------------------------------------------------------
do $$
declare
  deals_n int;
  non_default int;
  templates_n int;
begin
  select count(*) into deals_n from public.deals;
  select count(*) into non_default from public.deals where warranty_days <> 14;

  if to_regclass('public.deal_templates') is null then
    templates_n := 0;
  else
    select count(*) into templates_n from public.deal_templates;
  end if;

  raise notice '------------------------------------------------------';
  raise notice 'deals                     : %', deals_n;
  raise notice '  ...not on the 14-day default: %', non_default;
  raise notice 'saved packages            : %  (each now carries its own default)', templates_n;
  raise notice '';
  raise notice 'Set support days on a package so new deals start there, or on';
  raise notice 'the deal itself to override it for one client. Whatever the';
  raise notice 'deal says is copied to the project when you lock it, and is';
  raise notice 'printed on the agreement they sign.';
  raise notice '------------------------------------------------------';
end $$;
