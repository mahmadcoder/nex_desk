-- ============================================================
-- NEX DESK — LEAVING DATE (2027-15)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_14.sql
--
-- Why:
--   Salary was pre-filled at the full monthly amount regardless of when
--   somebody started. Joining on the 10th of a 31-day month earns 22/31 of a
--   month, not all of it — and `joining_date` was already on the employee, so
--   only the reverse case was missing.
--
--   `leaving_date` is deliberately NOT the same thing as `status`. Status
--   controls whether the account works; a leaving date is a fact about pay.
--   Collapsing the two would mean recording a future last day silently cut
--   somebody's access today.
-- ============================================================

do $$
begin
  if to_regclass('public.employees') is null then
    raise exception 'Run supabase/idempotent_employees_schema.sql first.';
  end if;
end $$;


alter table if exists public.employees
  add column if not exists leaving_date date;

comment on column public.employees.leaving_date is
  'Last working day, when known. Used only to pro-rate the final month''s pay — it does NOT deactivate the account, which is what status is for.';

-- Nobody can leave before they arrived.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'employees_leaving_after_joining') then
    alter table public.employees
      add constraint employees_leaving_after_joining
      check (leaving_date is null or joining_date is null or leaving_date >= joining_date);
  end if;
end $$;


do $$
declare leavers int; joiners_midmonth int;
begin
  select count(*) into leavers from public.employees where leaving_date is not null;

  select count(*) into joiners_midmonth
    from public.employees
   where joining_date is not null and extract(day from joining_date) > 1;

  raise notice '------------------------------------------------------';
  raise notice 'employees with a leaving date : %', leavers;
  raise notice 'employees who joined mid-month: %', joiners_midmonth;
  raise notice '';
  raise notice 'Recording a salary payment now works out the part-month';
  raise notice 'automatically from real calendar days — 28, 29, 30 or 31 —';
  raise notice 'for both the joining month and the leaving month. The figure';
  raise notice 'is a suggestion and stays editable.';
  raise notice '------------------------------------------------------';
end $$;
