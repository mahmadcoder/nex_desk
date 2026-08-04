-- ============================================================
-- NEX DESK — BOOKING FEE & GRACE WINDOW (2027-13)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_12.sql
--
-- The gap this closes:
--   2027-12 shipped a pure pro-rata refund — the agency keeps only the work
--   actually delivered. So a client who paid the advance and cancelled five
--   days later, with nothing built, got everything back. Those five days had a
--   real cost: the slot was held and other work was turned down.
--
--   The fix is a FLOOR, not a time-tiered percentage:
--
--     retained = max( work delivered at contract rate , booking fee )
--
--   A percentage tied to the clock but blind to work delivered fails in both
--   directions — it overcharges someone who cancels on day three (nothing was
--   built) and undercharges someone who cancels at 90% complete. Since this
--   app already measures delivered work directly, the clock is not needed as a
--   proxy for it.
--
--   The clock earns its place in exactly one spot: a 48-hour grace window
--   where the booking fee is waived entirely, so genuine second thoughts cost
--   the client nothing. That costs the agency almost nothing (no work has
--   started) and is worth a great deal at the moment a client is nervous about
--   paying a stranger.
-- ============================================================

do $$
begin
  if to_regclass('public.settings') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'settings' and column_name = 'refund_policy'
  ) then
    raise exception 'Run supabase/idempotent_fixes_2027_12.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. THE TWO NUMBERS
-- ------------------------------------------------------------

alter table if exists public.settings
  add column if not exists booking_fee_pct    int not null default 25,
  add column if not exists refund_grace_hours int not null default 48;

comment on column public.settings.booking_fee_pct is
  'Minimum the agency keeps on a cancellation, as a percentage of what the client actually PAID (never of the contract value, so it can never exceed what they handed over). Only applies when it exceeds the value of work delivered.';
comment on column public.settings.refund_grace_hours is
  'How long after the first payment a client may cancel with the booking fee waived, provided no work has started. 0 disables the grace window.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'settings_booking_fee_check') then
    alter table public.settings
      add constraint settings_booking_fee_check
      check (booking_fee_pct >= 0 and booking_fee_pct <= 100);
  end if;

  -- Two weeks is already far past "second thoughts"; beyond that it is not a
  -- grace window, it is a different policy.
  if not exists (select 1 from pg_constraint where conname = 'settings_grace_hours_check') then
    alter table public.settings
      add constraint settings_grace_hours_check
      check (refund_grace_hours >= 0 and refund_grace_hours <= 336);
  end if;
end $$;


-- ------------------------------------------------------------
-- 2. THE POLICY WORDING
--
-- The 2027-12 text describes pure pro-rata and would now contradict what the
-- calculation actually does — a policy that disagrees with the arithmetic is
-- worse than no policy at all.
--
-- Guarded on the row still matching the 2027-12 default, so anyone who has
-- already reworded their policy in Settings keeps their own text.
-- ------------------------------------------------------------

update public.settings
set refund_policy =
'If you cancel, we refund what we have not yet earned.

• Within 48 hours of your first payment, before work has started — everything comes back, less only bank charges and anything already bought in your name (domains, licences and similar cannot be recovered). No questions asked.

• After that, before work has started — we keep 25% of what you have paid as a booking fee. Your start date was reserved and other work was turned down to hold it. The rest is returned.

• Once work is under way — you pay for the work delivered to that point, valued at the rates in this agreement, and you keep everything produced. Where that is less than the 25% booking fee, the booking fee applies instead. The balance is returned.

• After handover — the work is delivered and paid for, so there is no refund. Defects remain covered by the warranty period.

Bank and transfer charges are not ours to refund. We return what actually reached us, less the cost of sending it back.'
where id = 1
  and refund_policy like 'If you cancel, we refund what we have not yet earned.%'
  and refund_policy like '%Before work starts — everything you have paid is returned%';


-- ------------------------------------------------------------
-- 3. REPORT
-- ------------------------------------------------------------

do $$
declare fee int; grace int; policy_updated boolean;
begin
  select booking_fee_pct, refund_grace_hours into fee, grace
    from public.settings where id = 1;

  select refund_policy like '%booking fee%' into policy_updated
    from public.settings where id = 1;

  raise notice '------------------------------------------------------';
  raise notice 'Booking fee    : % %% of what the client paid', fee;
  raise notice 'Grace window   : % hours', grace;
  raise notice 'Policy wording : %', case when policy_updated
    then 'updated to match'
    else 'left alone — you have edited it, so check it still matches the rules' end;
  raise notice '';
  raise notice 'On a cancellation the agency now keeps the GREATER of the';
  raise notice 'work delivered or the booking fee — so an early cancellation';
  raise notice 'is not free, and a late one is not under-charged.';
  raise notice '';
  raise notice 'Inside the grace window, with no work started, the fee is';
  raise notice 'waived entirely. Both numbers are editable in Settings.';
  raise notice '------------------------------------------------------';
end $$;
