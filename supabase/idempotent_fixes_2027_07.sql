-- ============================================================
-- NEX DESK — QUOTE PIPELINE (2027-07)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_06.sql
--
-- The problem this solves:
--   `deal_status` has had a 'sent' value since launch and nothing has ever
--   written it. A deal was built and locked in one motion, so there was no
--   state for "the quote is out, waiting on them", nothing chased a cold
--   quote, and losing one left no record at all — the deal simply never
--   appeared again. `quotation_sent` and `quotation_followup` have existed as
--   email templates since launch and have never once been sent, for exactly
--   the same reason.
--
--   No new enum value is added. "Lost" is `status = 'cancelled'` WITH
--   `lost_at` set. Postgres refuses to reference a newly added enum value in
--   the same transaction, and the Supabase SQL editor runs this whole file as
--   one — so `alter type deal_status add value 'lost'` plus a partial index on
--   that value in a single file fails with "unsafe use of new value of enum
--   type". Two columns sidestep the problem entirely.
--
-- Also fixes two live bugs and one production risk:
--   • set_deal_no() numbered deals with count(*)+1, so deleting any deal made
--     the next insert regenerate a number already taken
--   • `subscribers` is a live table that existed in no migration at all
-- ============================================================

do $$
begin
  if to_regclass('public.deals') is null or to_regclass('public.invoices') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. QUOTE STATE ON THE DEAL
-- ------------------------------------------------------------

alter table if exists public.deals
  add column if not exists quote_sent_at    timestamptz,
  add column if not exists quote_expires_on date,
  add column if not exists followup_count   int not null default 0,
  add column if not exists last_followup_at timestamptz,
  add column if not exists lost_at          timestamptz,
  add column if not exists lost_reason      text;

comment on column public.deals.quote_sent_at is
  'When the quotation was emailed. Drives the follow-up cadence and days-since-sent. NULL means never quoted — the deal was locked directly, which is still allowed.';
comment on column public.deals.quote_expires_on is
  'Validity date printed on the quotation PDF. Was previously computed at render time as now()+14d, so re-opening an old quote silently renewed its own validity.';
comment on column public.deals.followup_count is
  'How many chases have gone out. Indexes into the cadence in the daily cron; at the end of it the chasing stops and the deal goes to the admin digest instead.';
comment on column public.deals.last_followup_at is
  'Hard floor between chases. After a cron outage the backlog must not fire two emails at one client on the same morning.';
comment on column public.deals.lost_at is
  'Set alongside status=''cancelled''. A cancelled deal WITH lost_at is a quote that was turned down; without it, an agreement that was called off after being locked.';
comment on column public.deals.lost_reason is
  'Why, in their words. The only thing that makes a win rate mean anything.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'deals_followup_count_check') then
    alter table public.deals
      add constraint deals_followup_count_check
      check (followup_count >= 0 and followup_count <= 10);
  end if;
end $$;


-- ------------------------------------------------------------
-- 2. INDEXES
--
-- 'sent' already exists in deal_status, so a partial index on it is safe in
-- this same file — which is precisely what a freshly added 'lost' value would
-- not have been.
-- ------------------------------------------------------------

create index if not exists idx_deals_open_quotes
  on public.deals (quote_sent_at)
  where status = 'sent';

create index if not exists idx_deals_status_created
  on public.deals (status, created_at desc);

-- The cash-flow forecast reads every unpaid invoice on each page load.
create index if not exists idx_invoices_forecast
  on public.invoices (status, due_date);


-- ------------------------------------------------------------
-- 3. DEAL NUMBERING  (live bug)
--
-- set_deal_no() derived the sequence from count(*), so deleting any deal made
-- the next insert regenerate a number that already existed — a unique
-- violation on deal_no, which lockDeal rethrows as a failed lock. Harmless
-- while deals were only ever created and locked; quote churn makes deleting a
-- dead one routine, so it becomes reachable now.
--
-- Deriving from max(trailing number) within the current year is stable under
-- deletes and keeps the numbering per-year rather than global.
-- ------------------------------------------------------------

create or replace function set_deal_no()
returns trigger language plpgsql as $$
declare n int;
begin
  if new.deal_no is null then
    select coalesce(max(substring(deal_no from '(\d+)$')::int), 0) + 1
      into n
      from public.deals
     where deal_no like 'ND-D-' || to_char(now(), 'YYYY') || '-%';

    new.deal_no := 'ND-D-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0');
  end if;
  return new;
end; $$;

drop trigger if exists deals_set_no on public.deals;
create trigger deals_set_no before insert on public.deals
  for each row execute function set_deal_no();


-- ------------------------------------------------------------
-- 4. SUBSCRIBERS  (production risk)
--
-- This table is live — src/app/api/subscribe/route.ts writes it and the
-- Subscribers page reads it — but it appeared in NO migration file, so the
-- schema could not rebuild the database. Created here to match what the code
-- actually uses; `if not exists` means an existing table is left untouched.
-- ------------------------------------------------------------

create table if not exists public.subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  name       text,
  source     text default 'website_footer',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- For an older hand-made copy of the table that may be missing them.
alter table public.subscribers
  add column if not exists name       text,
  add column if not exists source     text default 'website_footer',
  add column if not exists is_active  boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

comment on table public.subscribers is
  'Newsletter list captured by the public site footer. Unsubscribing sets is_active=false rather than deleting, so a re-subscribe is not treated as a new signup.';

create index if not exists idx_subscribers_active
  on public.subscribers (created_at desc)
  where is_active;

-- Anonymous visitors subscribe through the service-role API route, not
-- directly, so no public insert policy is needed or wanted here.
alter table public.subscribers enable row level security;
drop policy if exists "staff manage subscribers" on public.subscribers;
create policy "staff manage subscribers" on public.subscribers
  for all using (is_staff()) with check (is_staff());


-- ------------------------------------------------------------
-- 5. DROP AN ORPHANED COLUMN
--
-- milestones.client_approved predates the approval flow and was superseded by
-- approved_at / approved_by in 2027-05. Leaving a dead boolean next to the
-- live pair invites wiring the wrong one.
-- ------------------------------------------------------------

alter table if exists public.milestones
  drop column if exists client_approved;


-- ------------------------------------------------------------
-- 6. REPORT
-- ------------------------------------------------------------

do $$
declare open_quotes int; lost int; won int; subs int;
begin
  select count(*) into open_quotes from public.deals where status = 'sent';
  select count(*) into lost        from public.deals where lost_at is not null;
  select count(*) into won         from public.deals where status = 'locked';
  select count(*) into subs        from public.subscribers;

  raise notice '------------------------------------------------------';
  raise notice 'Quote pipeline ready.  open: %   won: %   lost: %', open_quotes, won, lost;
  raise notice 'subscribers table secured. rows: %', subs;
  raise notice '';
  raise notice 'A deal now has two exits. "Send as quote" emails the';
  raise notice 'quotation and parks it in `sent`; the daily cron chases on';
  raise notice 'day 3, 7 and 14, then stops and tells you it went cold.';
  raise notice '';
  raise notice '"Lock the deal" is unchanged and still goes straight to a';
  raise notice 'project — quoting is a second door, not a new step.';
  raise notice '------------------------------------------------------';
end $$;
