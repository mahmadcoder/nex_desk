-- ============================================================
-- NEX DESK — CANCELLATION & REFUNDS (2027-12)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_11.sql
--
-- The problem this solves:
--   A client cancels and there is no answer to "how much do we send back".
--   `refund_cancellation` has existed as an email template since launch and
--   has never been sent, because nothing produced a figure to put in it.
--
--   The policy is: REFUND WHAT YOU HAVE NOT EARNED.
--     refund = money that actually reached us
--            − work already delivered, valued at the contract rate
--            − third-party costs already spent and not recoverable
--            − what it costs to send the money back
--     …floored at zero. If delivered work exceeds what they paid, the refund
--     is nothing and you do not chase them for the difference.
--
-- Why `payments.fee` had to exist first:
--   `payments.amount` is what the client SENT. On an international transfer
--   the bank or gateway takes a cut, so what actually landed is less. Without
--   recording that, refunding "what they paid" hands back money that never
--   arrived — the agency covers the bank's fee out of its own pocket, on a
--   project it is already losing.
-- ============================================================

do $$
begin
  if to_regclass('public.payments') is null or to_regclass('public.projects') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. WHAT THE BANK TOOK ON THE WAY IN
-- ------------------------------------------------------------

alter table if exists public.payments
  add column if not exists fee numeric(12,2) not null default 0;

comment on column public.payments.amount is
  'What the client SENT, in the payment currency. This is what settles the invoice — the client paid it, whatever the bank kept.';
comment on column public.payments.fee is
  'Bank or gateway charge deducted from this payment, so amount − fee is what actually reached the account. Used only by the refund calculation; it must never reduce what the invoice counts as paid.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_fee_check') then
    alter table public.payments
      add constraint payments_fee_check check (fee >= 0 and fee <= amount);
  end if;
end $$;


-- ------------------------------------------------------------
-- 2. THE CANCELLATION ITSELF
--
-- `project_status` already includes 'cancelled', so no enum change is needed
-- — these columns record the settlement around it.
-- ------------------------------------------------------------

alter table if exists public.projects
  add column if not exists cancelled_at        timestamptz,
  add column if not exists cancellation_reason text,
  -- The agreed figure, which may differ from the computed one: the statement
  -- is the start of a conversation, not a verdict.
  add column if not exists refund_amount       numeric(12,2),
  add column if not exists refund_currency     text,
  add column if not exists refund_fee          numeric(12,2) not null default 0,
  add column if not exists refund_notes        text,
  add column if not exists refunded_at         timestamptz,
  -- Percentage of the work treated as delivered when the figure was agreed.
  -- Stored so the statement can be reproduced months later, when `progress`
  -- has moved on or the milestones have been edited.
  add column if not exists cancel_progress_pct int;

comment on column public.projects.cancelled_at is
  'When the project was cancelled and a settlement agreed. Distinct from refunded_at, which is when the money actually went back.';
comment on column public.projects.refund_amount is
  'The agreed refund. NULL means cancelled with nothing to return; 0 means explicitly nothing owed.';
comment on column public.projects.refund_fee is
  'Cost of sending the refund — an international transfer is not free, and it comes off the amount returned.';
comment on column public.projects.cancel_progress_pct is
  'Work treated as delivered, as a percentage, at the moment the figure was agreed. Frozen so the statement stays reproducible.';


-- ------------------------------------------------------------
-- 3. THE POLICY, IN WRITING
--
-- Belongs in the agreement, not in an argument afterwards. Seeded with the
-- default wording; edit it in Settings and it flows into new agreements.
-- ------------------------------------------------------------

alter table if exists public.settings
  add column if not exists refund_policy text;

update public.settings
set refund_policy =
'If you cancel, we refund what we have not yet earned.

• Before work starts — everything you have paid is returned, less any costs already spent on your behalf (domains, licences and similar are bought in your name and cannot be recovered).
• Once work is under way — you pay for the work delivered to that point, valued at the rates in this agreement, and keep everything produced. The balance is returned.
• After handover — the work is delivered and paid for, so there is no refund. Defects remain covered by the warranty period.

Bank and transfer charges are not ours to refund: we return what actually reached us, less the cost of sending it back.'
where id = 1 and (refund_policy is null or refund_policy = '');


-- ------------------------------------------------------------
-- 4. INDEX
-- ------------------------------------------------------------

create index if not exists idx_projects_cancelled
  on public.projects (cancelled_at desc)
  where cancelled_at is not null;


-- ------------------------------------------------------------
-- 5. REPORT
-- ------------------------------------------------------------

do $$
declare with_fee int; cancelled int;
begin
  select count(*) into with_fee   from public.payments where fee > 0;
  select count(*) into cancelled  from public.projects where cancelled_at is not null;

  raise notice '------------------------------------------------------';
  raise notice 'Cancellation & refunds ready.';
  raise notice '  payments with a recorded bank fee : %', with_fee;
  raise notice '  cancelled projects                : %', cancelled;
  raise notice '';
  raise notice 'When recording a payment you can now enter the bank charge';
  raise notice 'that was deducted. It does NOT change what the invoice';
  raise notice 'counts as paid — the client paid it — but the refund';
  raise notice 'calculation uses what actually landed.';
  raise notice '';
  raise notice 'Cancel a project from its page to produce a settlement';
  raise notice 'statement with the refund figure worked out line by line.';
  raise notice '';
  raise notice 'The refund policy is now in Settings and goes into new';
  raise notice 'agreements, so it is agreed up front rather than argued.';
  raise notice '------------------------------------------------------';
end $$;
