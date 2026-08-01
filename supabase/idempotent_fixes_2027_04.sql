-- ============================================================
-- NEX DESK — PORTAL SIGN-IN HISTORY (2027-04)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_03.sql
--
-- "Welcome, Afaq" the first time and "Welcome back, Afaq" afterwards needs
-- something to remember by. Two columns, and they are useful beyond the
-- greeting: a client who has never signed in has not seen a single progress
-- update, which is worth knowing before you assume they are up to date.
-- ============================================================

do $$
begin
  if to_regclass('public.clients') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
end $$;

alter table if exists public.clients
  add column if not exists last_portal_login_at timestamptz,
  add column if not exists portal_login_count   int not null default 0;

comment on column public.clients.portal_login_count is
  'Successful portal sign-ins. 0 means they have never opened it — they have seen no progress update at all.';

-- Anyone who already has a portal account has almost certainly signed in, but
-- we cannot prove it, so they are left at 0 and get the first-time greeting
-- once. Harmless, and honest.

do $$
declare never_in int; total int;
begin
  select count(*) into total    from public.clients;
  select count(*) into never_in from public.clients where portal_login_count = 0;

  raise notice '------------------------------------------------------';
  raise notice 'clients: %   never signed in: %', total, never_in;
  raise notice '';
  raise notice 'From now on the portal greets a first-time visitor with';
  raise notice '"Welcome, <name>" and everyone after that with "Welcome back".';
  raise notice '------------------------------------------------------';
end $$;
