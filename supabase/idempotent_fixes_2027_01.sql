-- ============================================================
-- NEX DESK — PHASE 13: TRUST, VISIBILITY & RECURRING REVENUE (2027-01)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2026_12.sql
--
-- Adds:
--   1. Agreement acceptance in the portal (replaces print → sign → scan)
--   2. Retainers — recurring deals the daily cron bills on its own
--   3. Deal templates — lock a standard package without retyping it
--   4. Indexes so the activity timeline and at-risk queries stay quick
-- ============================================================


-- ------------------------------------------------------------
-- 0. PRECONDITIONS
-- ------------------------------------------------------------

do $$
begin
  if to_regclass('public.deals') is null or to_regclass('public.audit_log') is null then
    raise exception 'Run supabase/schema.sql first, then re-run this file.';
  end if;
  if to_regclass('public.employee_compensation') is null then
    raise exception 'Run supabase/idempotent_fixes_2026_12.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. AGREEMENT ACCEPTANCE
--
-- Asking a client to print an agreement, sign it, scan it and upload it is
-- three chances to lose the deal to friction. A recorded click with a
-- timestamp, an IP and the name they typed is stronger evidence than a
-- photographed signature, and takes five seconds.
-- ------------------------------------------------------------

alter table if exists public.deals
  add column if not exists accepted_at   timestamptz,
  add column if not exists accepted_name text,
  add column if not exists accepted_ip   text,
  add column if not exists accepted_ua   text;

comment on column public.deals.accepted_at is
  'When the client accepted the agreement in the portal. NULL means never accepted there.';
comment on column public.deals.accepted_ip is
  'Recorded as evidence of acceptance alongside the typed name and timestamp.';


-- ------------------------------------------------------------
-- 2. RETAINERS
--
-- `retainer_renewal` has existed as an email template since launch with no
-- retainer behind it. Monthly SEO and maintenance clients are the most
-- predictable revenue an agency has, and they were being invoiced by hand or
-- not at all.
-- ------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'billing_cycle') then
    create type billing_cycle as enum ('monthly','quarterly','yearly');
  end if;
end $$;

alter table if exists public.deals
  add column if not exists is_retainer      boolean not null default false,
  add column if not exists billing_cycle    billing_cycle,
  add column if not exists next_renewal_on  date,
  add column if not exists retainer_ends_on date;

create index if not exists idx_deals_retainer_due
  on public.deals (next_renewal_on)
  where is_retainer and status = 'locked';

comment on column public.deals.next_renewal_on is
  'The date the cron raises the next retainer invoice. NULL pauses billing without cancelling the retainer.';


-- ------------------------------------------------------------
-- 3. DEAL TEMPLATES
--
-- Re-entering the same deliverables, schedule and terms for every "SEO
-- retainer" is where typos and inconsistent pricing come from.
-- ------------------------------------------------------------

create table if not exists public.deal_templates (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  currency       text not null default 'USD',
  deliverables   jsonb not null default '[]'::jsonb,
  payment_schedule jsonb not null default '[]'::jsonb,
  milestones     jsonb not null default '[]'::jsonb,
  service_slugs  text[] default '{}',
  scope          text,
  exclusions     text,
  terms          text,
  duration_days  int,
  revisions_included int default 2,
  tax_percent    numeric(5,2) default 0,
  is_retainer    boolean not null default false,
  billing_cycle  billing_cycle,
  use_count      int not null default 0,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);

alter table public.deal_templates enable row level security;
drop policy if exists "staff manage deal templates" on public.deal_templates;
create policy "staff manage deal templates" on public.deal_templates
  for all using (is_staff()) with check (is_staff());


-- ------------------------------------------------------------
-- 4. INDEXES FOR THE NEW READS
--
-- `audit_log` has recorded every privileged action since Phase 5 and nothing
-- ever read it back, so it had no index for reading by entity.
-- ------------------------------------------------------------

create index if not exists idx_audit_entity
  on public.audit_log (entity, entity_id, created_at desc);

create index if not exists idx_audit_created
  on public.audit_log (created_at desc);

create index if not exists idx_worklogs_employee_date
  on public.daily_work_logs (employee_id, work_date desc);


-- ------------------------------------------------------------
-- 5. REPORT
-- ------------------------------------------------------------

do $$
declare audits int; retainers int; accepted int;
begin
  select count(*) into audits    from public.audit_log;
  select count(*) into retainers from public.deals where is_retainer;
  select count(*) into accepted  from public.deals where accepted_at is not null;

  raise notice '------------------------------------------------------';
  raise notice 'audit entries now readable on client profiles: %', audits;
  raise notice 'retainers: %   agreements accepted in-portal: %', retainers, accepted;
  raise notice '';
  raise notice 'Turn an existing deal into a retainer with:';
  raise notice '  update public.deals set is_retainer = true, billing_cycle = ''monthly'',';
  raise notice '    next_renewal_on = current_date + 30 where deal_no = ''ND-...'';';
  raise notice '';
  raise notice 'The daily cron raises the invoice and emails it on that date.';
  raise notice '------------------------------------------------------';
end $$;
