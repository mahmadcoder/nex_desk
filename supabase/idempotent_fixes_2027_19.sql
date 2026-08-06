-- ============================================================
-- NEX DESK — THE AGENCY'S OWN IDENTITY (2027-19)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_18.sql
--
-- The Settings page has always let you edit the agency's name, address, phone
-- and WhatsApp — and NOTHING has ever read them back. Every PDF hardcodes
-- 'Nex Desk' (pdf/parts.tsx:33) and the literal string 'Multan, Pakistan'
-- (pdf/documents.tsx:31), and every email hardcodes company_name
-- (email/send.ts:150). Renaming the agency in Settings changed nothing a
-- client would ever see.
--
-- The code side of that is fixed in this deploy. This file adds the one field
-- that was missing outright:
--
--   settings.tax_id — the agency's own tax / NTN / VAT registration number.
--
-- Note the asymmetry it corrects. `clients.tax_id` has existed since launch,
-- ClientDialog collects it, and every PDF prints 'Tax ID: …' for the CLIENT.
-- The agency had no equivalent field, so no invoice could ever carry the one
-- number that makes it deductible for the business receiving it.
-- ============================================================

do $$
begin
  if to_regclass('public.settings') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
end $$;


alter table if exists public.settings
  add column if not exists tax_id text;

comment on column public.settings.tax_id is
  'The agency''s own tax / NTN / VAT registration number, printed on invoices and agreements. Distinct from clients.tax_id, which is the client''s.';


-- ------------------------------------------------------------
-- WHAT IS STILL UNSET
-- ------------------------------------------------------------
-- logo_url, website and socials have been columns with no UI since launch.
-- The logo now has an upload in Settings; the other two remain unused and are
-- left alone rather than quietly wired to something nobody asked for.
do $$
declare s record;
begin
  select company_name, address, city, country, tax_id, logo_url, email, phone
    into s from public.settings where id = 1;

  raise notice '------------------------------------------------------';
  if s is null then
    raise notice 'No settings row! Insert one with id = 1.';
  else
    raise notice 'Company     : %', coalesce(s.company_name, '(unset)');
    raise notice 'Address     : %', coalesce(nullif(concat_ws(', ', s.address, s.city, s.country), ''), '(unset)');
    raise notice 'Tax / NTN   : %', coalesce(s.tax_id, '(unset — add it in Settings)');
    raise notice 'Logo        : %', case when s.logo_url is null then '(none — upload in Settings)' else 'set' end;
    raise notice 'Email       : %', coalesce(s.email, '(unset)');
    raise notice 'Phone       : %', coalesce(s.phone, '(unset)');
    raise notice '';
    raise notice 'These now appear on every PDF and email. Until this deploy';
    raise notice 'they were saved and read by nothing, and the documents said';
    raise notice '"Nex Desk" and "Multan, Pakistan" no matter what was here.';
  end if;
  raise notice '------------------------------------------------------';
end $$;
