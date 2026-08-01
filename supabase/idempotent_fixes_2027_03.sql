-- ============================================================
-- NEX DESK — MISSING COLUMN: deals.service_slugs (2027-03)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_02.sql
--
-- ⚠️ THIS IS THE FIX FOR:
--     · Contract value showing "—" on a client with a locked deal
--     · "Services (0)" and "Lock the first deal" after locking one
--     · An empty project list in Daily Work Logs
--
-- `deals.service_slugs` is queried in three places and has never existed on
-- the deals table — it is on `leads` and on `deal_templates`, but not here.
-- PostgREST answers a select naming an unknown column with an ERROR and a null
-- result set, so those queries returned nothing at all and every figure derived
-- from deals rendered as empty. The invoice queries never mention the column,
-- which is why invoices looked fine while the contract value did not.
-- ============================================================


-- ------------------------------------------------------------
-- 0. PRECONDITIONS
-- ------------------------------------------------------------

do $$
begin
  if to_regclass('public.deals') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. THE COLUMN
--
-- Which services a deal covers. Drives the per-service daily-log fields, so a
-- log against an SEO project asks for rankings and one against a build asks
-- for shipped features.
-- ------------------------------------------------------------

alter table if exists public.deals
  add column if not exists service_slugs text[] default '{}';

comment on column public.deals.service_slugs is
  'Service slugs this deal covers. Resolves the project to a service category for the daily-log field sets.';

create index if not exists idx_deals_service_slugs
  on public.deals using gin (service_slugs);


-- ------------------------------------------------------------
-- 2. BACKFILL FROM WHAT WAS ALREADY SOLD
--
-- Deliverable line items were copied from the services catalogue at lock time,
-- so the titles still match. Anything that does not match is left empty and
-- falls back to matching on the project name, which is usually enough.
-- ------------------------------------------------------------

update public.deals d
set    service_slugs = sub.slugs
from (
  select dd.id,
         array_agg(distinct s.slug) as slugs
  from public.deals dd
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(dd.deliverables) = 'array'
         then dd.deliverables else '[]'::jsonb end
  ) as item
  join public.services s
    on lower(s.title) = lower(item->>'item')
  group by dd.id
) as sub
where d.id = sub.id
  and coalesce(array_length(d.service_slugs, 1), 0) = 0;


-- ------------------------------------------------------------
-- 3. REPORT
-- ------------------------------------------------------------

do $$
declare total_deals int; locked int; with_slugs int;
begin
  select count(*) into total_deals from public.deals;
  select count(*) into locked      from public.deals where status = 'locked';
  select count(*) into with_slugs  from public.deals
    where coalesce(array_length(service_slugs, 1), 0) > 0;

  raise notice '------------------------------------------------------';
  raise notice 'deals: %   locked: %   matched to a service: %', total_deals, locked, with_slugs;
  raise notice '';
  raise notice 'Reload a client profile now — the contract value, the numbered';
  raise notice 'service list and the "Deal locked" state should all appear.';
  raise notice 'The Daily Work Logs project dropdown will fill in too.';
  raise notice '------------------------------------------------------';
end $$;

-- Confirm it: this should list your locked deals with their client.
select d.deal_no, c.name as client, d.status, d.currency, d.total, d.service_slugs
from public.deals d
join public.clients c on c.id = d.client_id
order by d.created_at desc
limit 20;
