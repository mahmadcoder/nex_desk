-- ============================================================
-- NEX DESK — POST-DEPLOY FIXES (2026-08)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2026_07.sql
--
-- Adds:
--   1. 'spam' to the lead_status enum (lead spam/delete)
--   2. invoices.stage_index — ties an invoice to a payment_schedule stage so
--      staged billing cannot double-bill the same stage
--   3. A report of every profile and its role, so you can see who is owner,
--      admin, staff or client
-- ============================================================


-- ------------------------------------------------------------
-- 0. PRECONDITIONS
-- ------------------------------------------------------------

do $$
begin
  if to_regclass('public.invoices') is null or to_regclass('public.leads') is null then
    raise exception 'Run supabase/schema.sql first, then re-run this file.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. LEAD STATUS: 'spam'
--
-- Website forms attract junk. Marking a lead as spam keeps it out of the
-- pipeline counts without destroying the record.
-- ------------------------------------------------------------

alter type lead_status add value if not exists 'spam';


-- ------------------------------------------------------------
-- 2. INVOICES: which payment stage does this bill?
--
-- A deal's payment_schedule has several stages. Each becomes its own invoice.
-- Recording the stage index makes that idempotent: re-locking a deal, or
-- re-running the stage-invoice code, cannot bill the same stage twice.
-- ------------------------------------------------------------

alter table if exists public.invoices
  add column if not exists stage_index int;

comment on column public.invoices.stage_index is
  'Index into deals.payment_schedule that this invoice bills. NULL for ad-hoc invoices.';

-- Collapse any accidental duplicates before the unique index goes on.
delete from public.invoices a
using public.invoices b
where a.ctid > b.ctid
  and a.deal_id is not null
  and a.stage_index is not null
  and a.deal_id = b.deal_id
  and a.stage_index = b.stage_index;

create unique index if not exists uniq_invoice_deal_stage
  on public.invoices (deal_id, stage_index)
  where deal_id is not null and stage_index is not null;

-- Existing single-invoice deals were all the advance, i.e. stage 0.
update public.invoices
set    stage_index = 0
where  deal_id is not null
  and  stage_index is null
  and  not exists (
         select 1 from public.invoices o
         where o.deal_id = invoices.deal_id
           and o.stage_index = 0
           and o.id <> invoices.id
       );


-- ------------------------------------------------------------
-- 3. WHO IS WHO
--
-- Deliberately a report, not an update. Promoting the wrong account to owner
-- would be worse than leaving it alone, so this prints the list and you run
-- the UPDATE yourself — see the notice below.
-- ------------------------------------------------------------

do $$
declare
  r record;
  owners int;
begin
  raise notice '--- profiles ------------------------------------------';
  for r in
    select email, role::text as role, is_active
    from public.profiles
    order by (role::text <> 'client') desc, role::text, email
  loop
    raise notice '  % | % | active=%', rpad(coalesce(r.email, '(no email)'), 34), rpad(r.role, 7), r.is_active;
  end loop;

  select count(*) into owners
  from public.profiles where role in ('owner', 'admin') and is_active;

  raise notice '------------------------------------------------------';
  raise notice 'active owner/admin accounts: %', owners;

  if owners = 0 then
    raise warning
      'NO active owner or admin account exists. Your admin account is being treated as staff. Promote it with:  update public.profiles set role = ''owner'', is_active = true where email = ''your-admin@example.com'';';
  end if;
end $$;
