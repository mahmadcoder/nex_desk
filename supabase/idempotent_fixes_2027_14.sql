-- ============================================================
-- NEX DESK — PAYING STAFF & AGENCY EXPENSES (2027-14)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_13.sql
--
-- Two gaps this closes:
--
--   1. NOTHING RECORDS PAYING ANYONE. `employee_compensation` records a
--      DECISION — a raise, a bonus, a gift — and says so in its own email
--      copy: "this records the decision, it does not pay anyone". There has
--      never been a place to say "we transferred August's salary", and staff
--      could see nothing about their own pay anywhere in the app.
--
--   2. AGENCY COSTS HAVE NOWHERE TO GO. `project_expenses.client_id` is NOT
--      NULL, so a Cursor subscription or an office bill structurally cannot be
--      recorded. The only agency-wide cost figure in the app was a sum of
--      `salary_amount` across mixed currencies rendered under a hardcoded '$'.
--
-- A note on double counting, because it matters:
--   The Profitability page charges salary to projects as an ESTIMATE —
--   salary ÷ 208 hours × hours logged. `salary_payments` is the real money.
--   The two will never reconcile: someone logging 120 hours has ~58% of their
--   salary charged to projects, someone logging 250 hours has ~120%. They are
--   two answers to two different questions and must never be added together.
--   The pages say so on screen.
-- ============================================================

do $$
begin
  if to_regclass('public.employees') is null then
    raise exception 'Run supabase/idempotent_employees_schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. SALARY PAYMENTS — the transfer, not the decision
-- ------------------------------------------------------------

create table if not exists public.salary_payments (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,

  -- First day of the month this pay covers. Stored as a date rather than a
  -- text label so it sorts, groups and filters like every other date here.
  period_month  date not null,

  amount        numeric(12,2) not null,
  currency      text not null default 'USD',
  paid_on       date not null default current_date,
  method        text default 'bank_transfer',
  reference     text,

  -- Public URL of the uploaded transfer slip, same bucket and reasoning as
  -- client receipts: the employee opens it from an email, and a signed URL
  -- would expire while that email is still in their inbox.
  slip_url      text,
  note          text,

  recorded_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

comment on table public.salary_payments is
  'Actual money transferred to an employee. Distinct from employee_compensation, which records the decision to pay (a raise, a bonus) rather than the payment itself.';
comment on column public.salary_payments.period_month is
  'First day of the month the pay covers. A payment made on 3 September for August is period_month 2026-08-01, paid_on 2026-09-03.';
comment on column public.salary_payments.slip_url is
  'The uploaded proof of transfer. Shown to the employee on their My Pay page and linked from their email.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'salary_payments_amount_check') then
    alter table public.salary_payments
      add constraint salary_payments_amount_check check (amount > 0);
  end if;
end $$;

-- Deliberately NO unique constraint on (employee_id, period_month): paying a
-- month in two instalments is normal, and a constraint would simply be wrong.
-- The card warns when a month already has a payment instead.
create index if not exists idx_salary_payments_employee
  on public.salary_payments (employee_id, paid_on desc);

create index if not exists idx_salary_payments_period
  on public.salary_payments (period_month desc);

-- The books page sums a calendar month of outgoings.
create index if not exists idx_salary_payments_paid_on
  on public.salary_payments (paid_on desc);

alter table public.salary_payments enable row level security;
drop policy if exists "staff manage salary payments" on public.salary_payments;
create policy "staff manage salary payments" on public.salary_payments
  for all using (is_staff()) with check (is_staff());


-- ------------------------------------------------------------
-- 2. AGENCY EXPENSES — costs with no client behind them
--
-- Kept entirely separate from `project_expenses`, which is client-billable and
-- requires a client_id. Putting a Cursor seat against a project would quietly
-- reduce that project's margin for a cost the client never caused.
-- ------------------------------------------------------------

create table if not exists public.agency_expenses (
  id            uuid primary key default gen_random_uuid(),

  category      text not null default 'software',
  vendor        text,
  label         text not null,

  amount        numeric(12,2) not null,
  currency      text not null default 'USD',
  incurred_on   date not null default current_date,

  -- Subscriptions renew silently. Recording the date lets the daily cron warn
  -- before the card is charged again, the same way client domains are chased.
  is_recurring  boolean not null default false,
  renews_on     date,
  renewal_notified_at timestamptz,

  receipt_url   text,
  notes         text,

  recorded_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.agency_expenses is
  'What the agency spends on itself — tools, subscriptions, hardware, office. Never billed to a client; that is project_expenses.';
comment on column public.agency_expenses.renews_on is
  'Next charge date for a subscription. The daily cron warns 30, 14 and 3 days ahead so a renewal is a decision rather than a surprise.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agency_expenses_amount_check') then
    alter table public.agency_expenses
      add constraint agency_expenses_amount_check check (amount >= 0);
  end if;
end $$;

create index if not exists idx_agency_expenses_incurred
  on public.agency_expenses (incurred_on desc);

create index if not exists idx_agency_expenses_renewal
  on public.agency_expenses (renews_on)
  where renews_on is not null;

alter table public.agency_expenses enable row level security;
drop policy if exists "staff manage agency expenses" on public.agency_expenses;
create policy "staff manage agency expenses" on public.agency_expenses
  for all using (is_staff()) with check (is_staff());


-- ------------------------------------------------------------
-- 3. REPORT
-- ------------------------------------------------------------

do $$
declare pays int; exps int; staff_count int;
begin
  select count(*) into pays  from public.salary_payments;
  select count(*) into exps  from public.agency_expenses;
  select count(*) into staff_count from public.employees where status ilike 'active';

  raise notice '------------------------------------------------------';
  raise notice 'salary payments recorded : %', pays;
  raise notice 'agency expenses recorded : %', exps;
  raise notice 'active employees         : %', staff_count;
  raise notice '';
  raise notice 'Record a salary payment from an employee page: month,';
  raise notice 'amount, date and the transfer slip. They are emailed, they';
  raise notice 'get an in-app notification, and it appears on their own';
  raise notice 'My Pay page — which shows nobody else''s pay, ever.';
  raise notice '';
  raise notice 'Agency Expenses is for what you buy for YOURSELVES. Tools';
  raise notice 'bought FOR a client still belong in that client''s expenses,';
  raise notice 'where they can be re-billed.';
  raise notice '';
  raise notice 'Money In & Out totals real cash both ways. It will NOT';
  raise notice 'match Profitability, which estimates salary per project —';
  raise notice 'two different questions, and adding them means nothing.';
  raise notice '------------------------------------------------------';
end $$;
