-- ============================================================
-- NEX DESK — CONTRACT vs EXTRAS AUDIT (2027-10)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: it CHANGES NO DATA. It only reports.
--
-- Run AFTER supabase/idempotent_fixes_2027_09.sql
-- ★ RUN THIS AND READ THE OUTPUT **BEFORE** DEPLOYING THE CODE CHANGES ★
--
-- Why this exists:
--   Every page used to compute "what does this client still owe on their
--   agreement" as `deals.total − (every payment on every invoice)`. So a
--   client who paid $110 for a domain appeared to owe $110 less on a $4,000
--   contract — and in the handover gate that was worse than a wrong number: it
--   unlocked handover, giving away credentials and ownership, on a project
--   that was still owed for.
--
--   The fix classifies invoices by where they came from:
--
--     payment stage     deal_id SET   stage_index SET    ← the contract
--     retainer renewal  deal_id SET   stage_index NULL   ← recurring
--     change request    deal_id NULL  stage_index NULL   ← extra
--     expense re-bill   deal_id NULL  stage_index NULL   ← extra
--
--   One row shape is ambiguous: `deal_id` set with `stage_index` null. Today
--   that means "retainer renewal". But before the 2026-08 migration added
--   `stage_index` at all, a genuine contract invoice could look identical —
--   and that migration's backfill could only stamp ONE invoice per deal
--   (its `not exists` guard), so a legacy deal billed across two or more
--   invoices may still have unstamped rows.
--
--   Left unstamped, those would now be reclassified as extras, the contract
--   would look less paid than it is, and a project you already delivered could
--   re-lock. This file finds them. It does not touch them.
-- ============================================================

do $$
begin
  if to_regclass('public.invoices') is null or to_regclass('public.deals') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. WRITE THE RULE INTO THE DATABASE
--
-- So the next person reads it here rather than inferring it from four
-- different insert sites.
-- ------------------------------------------------------------

comment on column public.invoices.deal_id is
  'The agreement this invoice belongs to. NULL for change requests and re-billed costs. Set together with stage_index for a contract payment stage; set alone for a retainer renewal.';

comment on column public.invoices.stage_index is
  'Index into deals.payment_schedule. An invoice bills the signed contract if and only if deal_id AND stage_index are both set — see src/lib/billing.ts. NULL alone (with deal_id set) means a recurring renewal.';


-- ------------------------------------------------------------
-- 2. THE REPORT
--
-- Expected result: every ambiguous row belongs to a retainer. Anything listed
-- under "NEEDS ATTENTION" is a legacy contract invoice to stamp by hand.
-- ------------------------------------------------------------

do $$
declare
  ambiguous       int;
  on_retainers    int;
  needs_attention int;
  extras_count    int;
  contract_count  int;
  r               record;
begin
  select count(*) into ambiguous
    from public.invoices
   where deal_id is not null and stage_index is null;

  select count(*) into on_retainers
    from public.invoices i
    join public.deals d on d.id = i.deal_id
   where i.deal_id is not null and i.stage_index is null
     and coalesce(d.is_retainer, false);

  select count(*) into needs_attention
    from public.invoices i
    join public.deals d on d.id = i.deal_id
   where i.deal_id is not null and i.stage_index is null
     and not coalesce(d.is_retainer, false);

  select count(*) into extras_count
    from public.invoices where deal_id is null;

  select count(*) into contract_count
    from public.invoices where deal_id is not null and stage_index is not null;

  raise notice '======================================================';
  raise notice 'INVOICE CLASSIFICATION';
  raise notice '  contract payment stages : %', contract_count;
  raise notice '  extras (no deal_id)     : %', extras_count;
  raise notice '  deal_id, no stage_index : %  (% on retainers)', ambiguous, on_retainers;
  raise notice '======================================================';

  if needs_attention = 0 then
    raise notice '';
    raise notice 'RESULT: CLEAN — safe to deploy.';
    raise notice 'Every ambiguous invoice belongs to a retainer, which is';
    raise notice 'exactly what that shape is supposed to mean.';
  else
    raise notice '';
    raise notice '*** NEEDS ATTENTION: % invoice(s) ***', needs_attention;
    raise notice '';
    raise notice 'These have a deal_id but no stage_index, and their deal is';
    raise notice 'NOT a retainer — so they are almost certainly legacy';
    raise notice 'contract invoices from before stage_index existed.';
    raise notice '';
    raise notice 'Left as they are, the fix will treat them as extras: the';
    raise notice 'contract will read less paid than it is, and a delivered';
    raise notice 'project could re-lock its handover.';
    raise notice '';
    raise notice 'Fix each by hand with the correct schedule position, e.g.';
    raise notice '  update public.invoices set stage_index = 1';
    raise notice '   where invoice_no = ''ND-2026-0004'';';
    raise notice '';
    raise notice '  invoice_no      deal_no          issued       amount';
    raise notice '  ------------------------------------------------------';

    for r in
      select i.invoice_no, d.deal_no, i.issue_date, i.total, i.currency
        from public.invoices i
        join public.deals d on d.id = i.deal_id
       where i.deal_id is not null and i.stage_index is null
         and not coalesce(d.is_retainer, false)
       order by i.issue_date
    loop
      raise notice '  %  %  %  % %',
        rpad(coalesce(r.invoice_no, '?'), 14),
        rpad(coalesce(r.deal_no, '?'), 15),
        rpad(coalesce(r.issue_date::text, '?'), 11),
        r.currency, r.total;
    end loop;
  end if;

  raise notice '======================================================';
end $$;


-- ------------------------------------------------------------
-- 3. OPTIONAL BACKFILL — COMMENTED OUT ON PURPOSE
--
-- Only after reading the report above, and only if you are satisfied the rows
-- listed really are the FIRST payment stage of their deal. The 2026-08 rule,
-- plus the `not is_retainer` clause it could not have had (retainers did not
-- exist then).
--
-- Uncomment, run, then re-run section 2 to confirm it comes back CLEAN.
-- ------------------------------------------------------------

-- update public.invoices i
--    set stage_index = 0
--   from public.deals d
--  where d.id = i.deal_id
--    and i.stage_index is null
--    and not coalesce(d.is_retainer, false)
--    and not exists (
--      select 1 from public.invoices x
--       where x.deal_id = i.deal_id and x.stage_index = 0
--    );
