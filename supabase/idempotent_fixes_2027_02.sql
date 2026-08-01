-- ============================================================
-- NEX DESK — SECURITY: CREDENTIALS AT REST (2027-02)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_01.sql
--
-- ⚠️  BEFORE RUNNING: set CREDENTIALS_KEY in your environment.
--        openssl rand -base64 32
--     Without it the app stores NOTHING rather than falling back to plaintext,
--     so account creation still works but the admin's convenience copy of a
--     password will be empty.
--
-- Adds:
--   1. Expiry on stored password previews — they stop being permanent
--   2. A warranty end date per project
--   3. Purges any plaintext preview older than the new window
-- ============================================================


-- ------------------------------------------------------------
-- 0. PRECONDITIONS
-- ------------------------------------------------------------

do $$
begin
  if to_regclass('public.clients') is null or to_regclass('public.employees') is null then
    raise exception 'Run the earlier migrations first.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'deals' and column_name = 'is_retainer'
  ) then
    raise exception 'Run supabase/idempotent_fixes_2027_01.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. PASSWORDS STOP BEING PERMANENT
--
-- `portal_password_preview` stored a readable password forever, on both
-- clients and employees, so the database held a working login for every person
-- who had ever been given one.
--
-- It is now encrypted at rest AND short-lived: the admin can copy it for a few
-- days after creation — which is the only time that is genuinely useful — and
-- after that the only route is a reset. A password nobody can read is a
-- password nobody can leak.
-- ------------------------------------------------------------

alter table if exists public.clients
  add column if not exists password_preview_expires_at timestamptz;

alter table if exists public.employees
  add column if not exists password_preview_expires_at timestamptz;

comment on column public.clients.portal_password_preview is
  'AES-256-GCM ciphertext (enc:v1:...), NOT plaintext. Purged after password_preview_expires_at by the daily cron.';
comment on column public.employees.portal_password_preview is
  'AES-256-GCM ciphertext (enc:v1:...), NOT plaintext. Purged after password_preview_expires_at by the daily cron.';

-- Everything already in these columns is plaintext written before encryption
-- existed. It cannot be encrypted here (the key lives in the app, not the
-- database) and it should not survive, so it goes now. Nobody is locked out:
-- Supabase auth holds the real password hash, and "Reset password" reissues.
update public.clients
set    portal_password_preview = null
where  portal_password_preview is not null
  and  portal_password_preview not like 'enc:v1:%';

update public.employees
set    portal_password_preview = null
where  portal_password_preview is not null
  and  portal_password_preview not like 'enc:v1:%';


-- ------------------------------------------------------------
-- 2. WARRANTY
--
-- The handover email promises free bug support and nothing recorded when that
-- ends, so it silently lasted forever. Fourteen days: long enough for real
-- defects to surface once real users arrive, short enough not to bleed.
--
-- Anything NEW remains a change request from day one regardless — that is a
-- separate boundary and it is already enforced.
-- ------------------------------------------------------------

alter table if exists public.projects
  add column if not exists warranty_days   int not null default 14,
  add column if not exists warranty_ends_on date;

comment on column public.projects.warranty_ends_on is
  'Set from handed_over_at + warranty_days at handover. Free defect fixes only — new work is always a change request.';

-- Backfill for anything already handed over.
update public.projects
set    warranty_ends_on = (handed_over_at::date + warranty_days)
where  handed_over_at is not null
  and  warranty_ends_on is null;


-- ------------------------------------------------------------
-- 3. REPORT
-- ------------------------------------------------------------

do $$
declare cleared_c int; cleared_e int; enc_c int;
begin
  select count(*) into cleared_c from public.clients   where portal_password_preview is null;
  select count(*) into cleared_e from public.employees where portal_password_preview is null;
  select count(*) into enc_c     from public.clients   where portal_password_preview like 'enc:v1:%';

  raise notice '------------------------------------------------------';
  raise notice 'Plaintext password previews have been cleared.';
  raise notice '  clients with no stored preview:   %', cleared_c;
  raise notice '  employees with no stored preview: %', cleared_e;
  raise notice '  already encrypted:                %', enc_c;
  raise notice '';
  raise notice 'Nobody is locked out — Supabase auth still holds the real';
  raise notice 'password. Use "Reset password" on a profile to issue a new one;';
  raise notice 'it is emailed to them and readable in the panel for 72 hours.';
  raise notice '';
  raise notice 'MAKE SURE CREDENTIALS_KEY IS SET, or new passwords will not be';
  raise notice 'stored at all:   openssl rand -base64 32';
  raise notice '------------------------------------------------------';
end $$;
