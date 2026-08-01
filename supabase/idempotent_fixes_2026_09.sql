-- ============================================================
-- NEX DESK — PHASE 9 FIXES (2026-09)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2026_08.sql
--
-- Adds:
--   1. projects.manual_progress — makes the progress bar work at all
--   2. settings.whatsapp seeded with the agency number
--   3. preferred_currency backfill for clients created before country mapping
--   4. A diagnostic for the "deal locked but the client page disagrees" report
-- ============================================================


-- ------------------------------------------------------------
-- 0. PRECONDITIONS
-- ------------------------------------------------------------

do $$
begin
  if to_regclass('public.projects') is null or to_regclass('public.clients') is null then
    raise exception 'Run supabase/schema.sql first, then re-run this file.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invoices' and column_name = 'stage_index'
  ) then
    raise exception 'Run supabase/idempotent_fixes_2026_08.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. PROGRESS THAT ACTUALLY MOVES
--
-- `recomputeProjectProgress` returned the milestone percentage whenever any
-- milestone existed and discarded the progress_delta from the daily work log.
-- `lockDeal` creates milestones on every deal, so in practice the delta was
-- ALWAYS discarded — the bar never moved for anyone.
--
-- Deltas now accumulate here, and the project shows whichever of the two
-- measures is further along.
-- ------------------------------------------------------------

alter table if exists public.projects
  add column if not exists manual_progress int not null default 0
    check (manual_progress between 0 and 100);

comment on column public.projects.manual_progress is
  'Accumulated progress_delta from daily work logs. Combined with milestone completion via max() — see recomputeProjectProgress.';

-- Seed it from the value already on screen so nothing appears to go backwards
-- the first time a log is filed after this migration.
update public.projects
set    manual_progress = least(100, greatest(0, coalesce(progress, 0)))
where  manual_progress = 0
  and  coalesce(progress, 0) > 0;


-- ------------------------------------------------------------
-- 2. WHATSAPP
--
-- Clients send receipts and signed pages on WhatsApp far more often than by
-- email. The column already existed and was never populated.
-- ------------------------------------------------------------

insert into public.settings (id) values (1) on conflict (id) do nothing;

update public.settings
set    whatsapp = '+92 302 6101761'
where  id = 1
  and  coalesce(nullif(trim(whatsapp), ''), '') = '';


-- ------------------------------------------------------------
-- 3. CURRENCY FROM COUNTRY
--
-- `convertLeadToClient` never set preferred_currency, so every converted lead
-- took the schema default of PKR and their deal, invoice and agreement PDF all
-- inherited it. New clients are mapped in code; this repairs existing rows.
--
-- Only touches rows still sitting on the untouched default.
-- ------------------------------------------------------------

update public.clients set preferred_currency = 'USD'
where coalesce(preferred_currency, 'PKR') = 'PKR'
  and lower(coalesce(country, '')) ~ '(united states|usa|america)';

update public.clients set preferred_currency = 'GBP'
where coalesce(preferred_currency, 'PKR') = 'PKR'
  and lower(coalesce(country, '')) ~ '(united kingdom|england|scotland|wales|britain)';

update public.clients set preferred_currency = 'AED'
where coalesce(preferred_currency, 'PKR') = 'PKR'
  and lower(coalesce(country, '')) ~ '(emirates|dubai|abu dhabi)';

update public.clients set preferred_currency = 'EUR'
where coalesce(preferred_currency, 'PKR') = 'PKR'
  and lower(coalesce(country, '')) ~ '(germany|france|spain|italy|netherlands|belgium|austria|ireland|portugal|greece)';

update public.clients set preferred_currency = 'CAD'
where coalesce(preferred_currency, 'PKR') = 'PKR'
  and lower(coalesce(country, '')) ~ 'canada';

update public.clients set preferred_currency = 'AUD'
where coalesce(preferred_currency, 'PKR') = 'PKR'
  and lower(coalesce(country, '')) ~ 'australia';


-- ------------------------------------------------------------
-- 4. DIAGNOSTIC — "I locked the deal but the client page says I didn't"
--
-- The page looks for deals.client_id = <client> AND status = 'locked'. Both
-- reported symptoms (the button still reading "Lock a deal", and a blank
-- contract value) mean no row matched. The code now also resolves deals
-- through projects.deal_id as a fallback, but the underlying data is worth
-- seeing. Anything flagged MISMATCH below is the culprit.
-- ------------------------------------------------------------

do $$
declare r record; bad int := 0;
begin
  raise notice '--- locked deals vs their client rows ------------------';
  for r in
    select d.deal_no, d.status::text as status, d.total, d.currency,
           d.client_id,
           c.id   as client_row,
           c.name as client_name,
           p.id   as project_id,
           p.client_id as project_client_id
    from public.deals d
    left join public.clients  c on c.id = d.client_id
    left join public.projects p on p.deal_id = d.id
    order by d.created_at desc
    limit 30
  loop
    if r.client_row is null then
      bad := bad + 1;
      raise notice 'MISMATCH  % | client_id % has NO clients row', r.deal_no, r.client_id;
    elsif r.project_client_id is not null and r.project_client_id <> r.client_id then
      bad := bad + 1;
      raise notice 'MISMATCH  % | deal.client_id % <> project.client_id %',
        r.deal_no, r.client_id, r.project_client_id;
    else
      raise notice 'ok        % | % | % % | client %',
        r.deal_no, rpad(r.status, 9), r.currency, r.total, r.client_name;
    end if;
  end loop;

  raise notice '------------------------------------------------------';
  if bad = 0 then
    raise notice 'Every deal points at a real client row.';
    raise notice 'If a client page still shows no deal, the deal belongs to a';
    raise notice 'DIFFERENT client record with the same person on it — check for';
    raise notice 'duplicates with the query printed below.';
  else
    raise notice '% deal(s) are mis-linked. Repoint them with:', bad;
    raise notice '  update public.deals set client_id = ''<correct-client-uuid>'' where deal_no = ''ND-…'';';
  end if;
end $$;

-- Duplicate client rows for the same person — the usual cause.
select lower(email) as email, count(*) as rows, array_agg(id) as client_ids,
       array_agg(created_at order by created_at) as created
from public.clients
group by lower(email)
having count(*) > 1;

-- Contract vs invoiced per locked deal, to confirm the figures on screen.
select d.deal_no, c.name as client, d.currency, d.total as contract_value,
       count(i.id) as invoices,
       coalesce(sum(i.total), 0)       as invoiced_total,
       coalesce(sum(i.amount_paid), 0) as paid_total
from public.deals d
join public.clients c on c.id = d.client_id
left join public.invoices i on i.deal_id = d.id
where d.status = 'locked'
group by d.id, d.deal_no, c.name, d.currency, d.total
order by d.deal_no;
