-- ============================================================
-- NEX DESK — DORMANT CLIENTS & STAFF STATUS (2027-16)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_15.sql
--
-- Two holes this closes:
--
--   1. A dormant or archived client saw the full portal. `portal/page.tsx`
--      never read `lifecycle`, so somebody whose work finished a year ago
--      could still upload documents and raise unlimited change requests —
--      each one emailing the admin. Their portal now goes read-only, with one
--      button to ask to work together again, and these columns record it.
--
--   2. `employees.status` was decorative. The values Active / On Leave /
--      Terminated existed, there was NO control in the panel to set them, and
--      nothing anywhere checked them: getCurrentStaff() selected only
--      employees.id. A terminated employee signed in and got the full staff
--      panel. The only working kill switch was editing profiles.is_active by
--      hand, in a different table from the one the admin was looking at.
-- ============================================================

do $$
begin
  if to_regclass('public.clients') is null or to_regclass('public.employees') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. A DORMANT CLIENT ASKING TO COME BACK
-- ------------------------------------------------------------

alter table if exists public.clients
  add column if not exists return_requested_at timestamptz,
  add column if not exists return_request_note text;

comment on column public.clients.return_requested_at is
  'When a dormant client asked to work together again from their portal. Cleared on reactivation so the next pause can be followed by a new request.';
comment on column public.clients.return_request_note is
  'What they said when they asked. Shown to the admin next to the approve button.';

-- The admin list wants "who is waiting on an answer" cheaply.
create index if not exists idx_clients_return_requested
  on public.clients (return_requested_at desc)
  where return_requested_at is not null;


-- ------------------------------------------------------------
-- 2. STAFF STATUS, MEANT THIS TIME
--
-- Normalised first: the column is free text with no constraint, so anything
-- could already be in there. Casing is forced to the three canonical values
-- before the constraint is added, or adding it would fail on live data.
-- ------------------------------------------------------------

update public.employees
set status = case
  when status is null or btrim(status) = '' then 'Active'
  when lower(btrim(status)) in ('active')                 then 'Active'
  when lower(btrim(status)) in ('on leave', 'on_leave')   then 'On Leave'
  when lower(btrim(status)) in ('terminated', 'inactive') then 'Terminated'
  else 'Active'
end
where status is null
   or status not in ('Active', 'On Leave', 'Terminated');

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'employees_status_check') then
    alter table public.employees
      add constraint employees_status_check
      check (status in ('Active', 'On Leave', 'Terminated'));
  end if;
end $$;

comment on column public.employees.status is
  'Active and On Leave can both sign in — somebody on leave still needs their pay and leave pages. Terminated blocks the panel entirely, enforced in getCurrentStaff().';

-- Several places already filter on active staff.
create index if not exists idx_employees_status
  on public.employees (status);


-- ------------------------------------------------------------
-- 3. REPORT
-- ------------------------------------------------------------

do $$
declare dormant int; waiting int; terminated int; on_leave int;
begin
  select count(*) into dormant    from public.clients where lifecycle <> 'active';
  select count(*) into waiting    from public.clients where return_requested_at is not null;
  select count(*) into terminated from public.employees where status = 'Terminated';
  select count(*) into on_leave   from public.employees where status = 'On Leave';

  raise notice '------------------------------------------------------';
  raise notice 'clients not active        : %', dormant;
  raise notice 'waiting on an answer      : %', waiting;
  raise notice 'employees terminated      : %  (these can no longer sign in)', terminated;
  raise notice 'employees on leave        : %  (these still can)', on_leave;
  raise notice '';
  raise notice 'A paused client keeps their portal but it is read-only —';
  raise notice 'they can still reach every invoice and document, and there';
  raise notice 'is one button to ask to work together again.';
  raise notice '';
  raise notice 'Check the terminated count above before deploying: anyone';
  raise notice 'listed there loses access the moment this ships.';
  raise notice '------------------------------------------------------';
end $$;
