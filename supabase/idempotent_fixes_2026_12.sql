-- ============================================================
-- NEX DESK — PHASE 12: STAFF COMPENSATION, LEAVE, PER-SERVICE LOGS (2026-12)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2026_11.sql
--
-- Adds:
--   1. employee_compensation — salary revisions, bonuses and gifts
--   2. leave_types + leave_requests — request → approve, with balances
--   3. services.log_fields + daily_work_logs.metrics — per-service work logs
-- ============================================================


-- ------------------------------------------------------------
-- 0. PRECONDITIONS
-- ------------------------------------------------------------

do $$
begin
  if to_regclass('public.employees') is null then
    raise exception 'Run supabase/idempotent_employees_schema.sql first.';
  end if;
  if to_regclass('public.daily_work_logs') is null then
    raise exception 'Run supabase/idempotent_daily_logs.sql first.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clients' and column_name = 'lifecycle'
  ) then
    raise exception 'Run supabase/idempotent_fixes_2026_11.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. COMPENSATION
--
-- `employees.salary_amount` held one number with no history, so a raise
-- overwrote the record of what someone used to earn, and bonuses and gifts had
-- nowhere to live at all.
--
--   salary_revision — changes the running salary, reissues the offer letter
--   bonus           — one-off payment; staff AND admin are emailed
--   gift            — recorded only. Deliberately silent: an email announcing
--                     a gift makes it a transaction rather than a gesture.
-- ------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'compensation_kind') then
    create type compensation_kind as enum ('salary_revision','bonus','gift');
  end if;
end $$;

create table if not exists public.employee_compensation (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.employees(id) on delete cascade,
  kind           compensation_kind not null,
  amount         numeric(12,2) not null default 0,
  currency       text not null default 'USD',
  -- Only meaningful for salary_revision: what they were on before.
  previous_amount numeric(12,2),
  effective_from date not null default current_date,
  reason         text,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);

create index if not exists idx_emp_comp_employee on public.employee_compensation(employee_id, created_at desc);

alter table public.employee_compensation enable row level security;
drop policy if exists "staff manage compensation" on public.employee_compensation;
-- Deliberately no self-read policy: salary history is owner/admin territory and
-- the app reads it with the service-role key behind requireOwnerAdmin().
create policy "staff manage compensation" on public.employee_compensation
  for all using (is_staff()) with check (is_staff());


-- ------------------------------------------------------------
-- 2. LEAVE
--
-- Staff request, admin approves, both are emailed. Each employee sees only
-- their own balance and history — enforced in the app through getCurrentStaff().
-- ------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'leave_status') then
    create type leave_status as enum ('pending','approved','declined','cancelled');
  end if;
end $$;

create table if not exists public.leave_types (
  id             uuid primary key default gen_random_uuid(),
  key            text not null unique,
  label          text not null,
  annual_days    int  not null default 0,   -- 0 = unlimited / not tracked
  is_paid        boolean not null default true,
  sort_order     int not null default 0
);

insert into public.leave_types (key, label, annual_days, is_paid, sort_order) values
  ('annual','Annual leave', 20, true,  1),
  ('sick','Sick leave',      8, true,  2),
  ('unpaid','Unpaid leave',  0, false, 3),
  ('emergency','Emergency',  3, true,  4)
on conflict (key) do nothing;

create table if not exists public.leave_requests (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  leave_type    text not null references public.leave_types(key),
  start_date    date not null,
  end_date      date not null,
  -- Stored rather than derived: half days and public holidays make a
  -- date-difference calculation wrong often enough to matter.
  days          numeric(4,1) not null default 1,
  reason        text,
  status        leave_status not null default 'pending',
  decided_by    uuid references public.profiles(id),
  decided_at    timestamptz,
  decision_note text,
  created_at    timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists idx_leave_employee on public.leave_requests(employee_id, start_date desc);
create index if not exists idx_leave_status   on public.leave_requests(status);

alter table public.leave_types    enable row level security;
alter table public.leave_requests enable row level security;

drop policy if exists "staff read leave types"     on public.leave_types;
drop policy if exists "staff manage leave"         on public.leave_requests;
drop policy if exists "employee reads own leave"   on public.leave_requests;

create policy "staff read leave types" on public.leave_types
  for select using (is_staff());

create policy "staff manage leave" on public.leave_requests
  for all using (is_staff()) with check (is_staff());

-- Belt and braces: even with a staff session, an employee row only matches
-- through their own user_id.
create policy "employee reads own leave" on public.leave_requests
  for select using (
    employee_id in (select id from public.employees where user_id = auth.uid())
  );


-- ------------------------------------------------------------
-- 3. PER-SERVICE WORK LOGS
--
-- An SEO day and an engineering day are not the same shape, so one form asking
-- "what did you do" loses everything worth reporting on. The service category
-- decides which extra fields appear; the answers live in a JSONB blob so a new
-- category is a data change, not a migration.
-- ------------------------------------------------------------

alter table if exists public.services
  add column if not exists log_fields jsonb;

alter table if exists public.daily_work_logs
  add column if not exists metrics jsonb not null default '{}'::jsonb;

comment on column public.services.log_fields is
  'Optional per-service override of the daily-log fields. NULL falls back to the category default in src/config/logFields.ts.';
comment on column public.daily_work_logs.metrics is
  'Answers to the per-service fields, keyed by field id.';


-- ------------------------------------------------------------
-- 4. REPORT
-- ------------------------------------------------------------

do $$
declare emps int; types int;
begin
  select count(*) into emps  from public.employees;
  select count(*) into types from public.leave_types;

  raise notice '------------------------------------------------------';
  raise notice 'employees: %', emps;
  raise notice 'leave types seeded: % (annual 20, sick 8, unpaid, emergency 3)', types;
  raise notice '';
  raise notice 'Change an allowance with:';
  raise notice '  update public.leave_types set annual_days = 25 where key = ''annual'';';
  raise notice '';
  raise notice 'Balances count APPROVED days in the current calendar year.';
  raise notice '------------------------------------------------------';
end $$;
