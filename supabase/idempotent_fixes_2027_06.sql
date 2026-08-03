-- ============================================================
-- NEX DESK — BILLABLE EXTRAS / PASS-THROUGH COSTS (2027-06)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_05.sql
--
-- The problem this solves:
--   A project is rarely just the agreed fee. A domain gets bought, a premium
--   plugin licence, a year of hosting, a stock photo pack, an ad budget top-up.
--   Until now none of that was recorded anywhere. It was paid from the agency
--   card and either forgotten (a straight loss against the margin) or chased
--   over WhatsApp with a screenshot and no record.
--
--   `project_expenses` makes each one a first-class row: what it was, what it
--   cost us, what the client is charged, the receipt, and when it renews.
--
--   Three things fall out of that for free:
--     • the client sees the receipt in their portal instead of asking
--     • Profitability stops treating a $200 domain as pure profit
--     • `domain_expiry` — an email template that has existed since launch and
--       never once been sent — finally has renewal dates to fire on
-- ============================================================

do $$
begin
  if to_regclass('public.clients') is null or to_regclass('public.invoices') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. THE TABLE
-- ------------------------------------------------------------

create table if not exists public.project_expenses (
  id            uuid primary key default gen_random_uuid(),

  client_id     uuid not null references public.clients(id) on delete cascade,
  -- Optional: a domain bought during onboarding may predate the project row.
  project_id    uuid references public.projects(id) on delete set null,
  -- Set when the extra is pushed onto an invoice, so it can never be billed twice.
  invoice_id    uuid references public.invoices(id) on delete set null,

  category      text not null default 'other',
  -- What it actually was, in words: "physicianmeds.com — 1 year".
  -- For the "Something else" category this is the free-text description.
  label         text not null,
  vendor        text,
  details       text,

  -- Two separate numbers on purpose. `cost` is what left the agency account;
  -- `bill_amount` is what the client is charged. Equal for a straight
  -- pass-through, higher when a handling margin is added, and zero when the
  -- item is absorbed or given as a goodwill gesture — which is a decision worth
  -- recording rather than a number quietly missing.
  cost          numeric(12,2) not null default 0,
  bill_amount   numeric(12,2) not null default 0,
  currency      text not null default 'USD',

  incurred_on   date not null default current_date,
  -- Annual domains, yearly licences, hosting. Drives the renewal reminder.
  renews_on     date,
  renewal_notified_at timestamptz,

  -- Public URL of the uploaded receipt (public-assets bucket, same as payment
  -- slips). The client can open their own receipt from the portal.
  receipt_url   text,

  -- unbilled  — recorded, not yet on any invoice
  -- invoiced  — pushed onto an invoice (invoice_id is set)
  -- absorbed  — the agency is eating this one; never bill it
  status        text not null default 'unbilled',

  visible_to_client boolean not null default true,

  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Added separately so re-running against an older copy of the table still
-- picks these up.
alter table public.project_expenses
  add column if not exists renewal_notified_at timestamptz,
  add column if not exists visible_to_client boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'project_expenses_status_check'
  ) then
    alter table public.project_expenses
      add constraint project_expenses_status_check
      check (status in ('unbilled', 'invoiced', 'absorbed'));
  end if;
end $$;

comment on table public.project_expenses is
  'Things bought on the client''s behalf — domains, hosting, licences, ad spend. Cost vs what they are billed, with the receipt.';
comment on column public.project_expenses.cost is
  'What the agency actually paid. Feeds the Profitability page.';
comment on column public.project_expenses.bill_amount is
  'What the client is charged. Zero means absorbed by the agency.';
comment on column public.project_expenses.renews_on is
  'Next renewal date for domains/licences. The daily cron warns 30, 14 and 3 days ahead.';


-- ------------------------------------------------------------
-- 2. INDEXES
-- ------------------------------------------------------------

create index if not exists idx_expenses_client
  on public.project_expenses (client_id, incurred_on desc);

create index if not exists idx_expenses_project
  on public.project_expenses (project_id);

-- The cron sweeps by renewal date; without this it scans the whole table daily.
create index if not exists idx_expenses_renewal
  on public.project_expenses (renews_on)
  where renews_on is not null;

create index if not exists idx_expenses_unbilled
  on public.project_expenses (client_id)
  where status = 'unbilled';


-- ------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
--
-- Staff manage these. The portal reads them through the service-role client
-- after proving ownership in application code, exactly like invoices — so no
-- client-facing policy is needed here, and adding one would only widen the
-- surface.
-- ------------------------------------------------------------

alter table public.project_expenses enable row level security;
drop policy if exists "staff manage expenses" on public.project_expenses;
create policy "staff manage expenses" on public.project_expenses
  for all using (is_staff()) with check (is_staff());


-- ------------------------------------------------------------
-- 4. KEEP updated_at HONEST
-- ------------------------------------------------------------

create or replace function public.touch_project_expense()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_project_expense on public.project_expenses;
create trigger trg_touch_project_expense
  before update on public.project_expenses
  for each row execute function public.touch_project_expense();


-- ------------------------------------------------------------
-- 5. REPORT
-- ------------------------------------------------------------

do $$
declare n int;
begin
  select count(*) into n from public.project_expenses;
  raise notice '------------------------------------------------------';
  raise notice 'project_expenses ready. rows: %', n;
  raise notice '';
  raise notice 'Add extras from a project or client page: pick a category,';
  raise notice 'enter what it cost and what the client pays, attach the';
  raise notice 'receipt. The client is emailed and sees it in their portal.';
  raise notice '';
  raise notice 'Set a renewal date on domains and licences — the daily cron';
  raise notice 'warns you and the client 30, 14 and 3 days before it lapses.';
  raise notice '------------------------------------------------------';
end $$;
