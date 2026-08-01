-- ============================================================
-- NEX DESK — PHASE 11: MULTI-SERVICE CLIENTS, REFERRALS, LIFECYCLE (2026-11)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2026_10.sql
--
-- Adds:
--   1. clients.referred_by_client_id — who introduced this client
--   2. clients.lifecycle + reactivated_at — active / dormant / archived
--   3. Backfills lifecycle from the is_active flag that nothing ever set
-- ============================================================


-- ------------------------------------------------------------
-- 0. PRECONDITIONS
-- ------------------------------------------------------------

do $$
begin
  if to_regclass('public.clients') is null then
    raise exception 'Run supabase/schema.sql first, then re-run this file.';
  end if;
  if to_regclass('public.change_requests') is null then
    raise exception 'Run supabase/idempotent_fixes_2026_10.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. REFERRALS
--
-- Word of mouth is how agencies actually grow, and there was nowhere to record
-- that one client introduced another — so the relationship lived in memory and
-- the referrer never got thanked.
-- ------------------------------------------------------------

alter table if exists public.clients
  add column if not exists referred_by_client_id uuid
    references public.clients(id) on delete set null,
  add column if not exists referral_note text;

create index if not exists idx_clients_referred_by
  on public.clients(referred_by_client_id)
  where referred_by_client_id is not null;

comment on column public.clients.referred_by_client_id is
  'The existing client who introduced this one. Drives the "Referred N clients" stat and the thank-you.';

-- A client cannot refer themselves.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'clients_no_self_referral'
  ) then
    alter table public.clients
      add constraint clients_no_self_referral
      check (referred_by_client_id is null or referred_by_client_id <> id);
  end if;
end $$;

-- Leads can carry it too, so the relationship survives conversion.
alter table if exists public.leads
  add column if not exists referred_by text;


-- ------------------------------------------------------------
-- 2. CLIENT LIFECYCLE
--
-- `clients.is_active` existed from day one and nothing ever wrote to it, so
-- finished clients sat in the list forever looking identical to live ones and
-- there was no way to bring one back when they returned.
--
--   active   — work in flight, or recently delivered
--   dormant  — every project finished; still a client, just not right now
--   archived — deliberately put away; hidden unless asked for
-- ------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'client_lifecycle') then
    create type client_lifecycle as enum ('active','dormant','archived');
  end if;
end $$;

alter table if exists public.clients
  add column if not exists lifecycle client_lifecycle not null default 'active',
  add column if not exists dormant_at     timestamptz,
  add column if not exists reactivated_at timestamptz,
  add column if not exists return_count   int not null default 0;

create index if not exists idx_clients_lifecycle on public.clients(lifecycle);

comment on column public.clients.return_count is
  'How many times this client has come back after going dormant. A returning client is worth knowing about.';

-- Carry across the old boolean, then mark anyone whose projects are all
-- finished as dormant so the list reflects reality from day one.
update public.clients
set    lifecycle = 'archived'
where  is_active = false and lifecycle = 'active';

update public.clients c
set    lifecycle = 'dormant',
       dormant_at = coalesce(c.dormant_at, now())
where  c.lifecycle = 'active'
  and  exists (select 1 from public.projects p where p.client_id = c.id)
  and  not exists (
         select 1 from public.projects p
         where p.client_id = c.id
           and p.status not in ('completed','cancelled')
       );


-- ------------------------------------------------------------
-- 3. REPORT
-- ------------------------------------------------------------

do $$
declare a int; d int; ar int; refs int;
begin
  select count(*) into a  from public.clients where lifecycle = 'active';
  select count(*) into d  from public.clients where lifecycle = 'dormant';
  select count(*) into ar from public.clients where lifecycle = 'archived';
  select count(*) into refs from public.clients where referred_by_client_id is not null;

  raise notice '------------------------------------------------------';
  raise notice 'clients — active: %  dormant: %  archived: %', a, d, ar;
  raise notice 'clients arrived via referral: %', refs;
  raise notice '';
  raise notice 'Dormant clients are hidden from the main list by default;';
  raise notice 'there is a toggle to show them, and a Reactivate button on';
  raise notice 'each profile that emails them a welcome-back.';
  raise notice '------------------------------------------------------';
end $$;
