-- ============================================================
-- NEX DESK — MILESTONE APPROVAL & KICKOFF CHECKLIST (2027-05)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_04.sql
--
-- Adds:
--   1. Client approval on milestones — "the client signed off" becomes a
--      recorded click in the portal instead of a WhatsApp message
--   2. The kickoff checklist — the five things the kickoff email asks for,
--      tickable by the client, chased by the daily cron
-- ============================================================

do $$
begin
  if to_regclass('public.milestones') is null or to_regclass('public.projects') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. MILESTONE APPROVAL
-- ------------------------------------------------------------

alter table if exists public.milestones
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text;

comment on column public.milestones.approved_at is
  'When the client approved this milestone in their portal. Only done milestones can be approved.';
comment on column public.milestones.approved_by is
  'The signed-in portal email that approved it — the identity, not a typed name.';


-- ------------------------------------------------------------
-- 2. KICKOFF CHECKLIST
--
-- The kickoff email asks for five things and nothing ever chased them, so
-- projects stalled on the client's side while looking like the agency's fault.
-- New projects get the list seeded at lock; existing live projects are
-- backfilled here so the cron has something to chase.
-- ------------------------------------------------------------

alter table if exists public.projects
  add column if not exists kickoff_items jsonb,
  add column if not exists kickoff_nudged_at timestamptz;

comment on column public.projects.kickoff_items is
  'What we still need from the client to start: [{id,label,done,done_at}]. Ticked by the client in the portal.';
comment on column public.projects.kickoff_nudged_at is
  'Last time the cron reminded the client about unticked items. Throttles the nudge to one a week.';

update public.projects
set kickoff_items = '[
  {"id":"brand",    "label":"Logo & brand files (AI, SVG or high-res PNG)", "done":false, "done_at":null},
  {"id":"content",  "label":"Text content for each page, or a rough draft", "done":false, "done_at":null},
  {"id":"imagery",  "label":"Photos or product images",                     "done":false, "done_at":null},
  {"id":"access",   "label":"Domain & hosting access",                      "done":false, "done_at":null},
  {"id":"accounts", "label":"Analytics or social accounts to connect",      "done":false, "done_at":null}
]'::jsonb
where kickoff_items is null
  and status in ('not_started','in_progress');


-- ------------------------------------------------------------
-- 3. REPORT
-- ------------------------------------------------------------

do $$
declare seeded int;
begin
  select count(*) into seeded from public.projects where kickoff_items is not null;
  raise notice '------------------------------------------------------';
  raise notice 'projects with a kickoff checklist: %', seeded;
  raise notice '';
  raise notice 'Clients tick items in their portal. The daily cron nudges';
  raise notice 'anyone with unticked items, at most once a week, starting';
  raise notice 'three days after the project start date.';
  raise notice '------------------------------------------------------';
end $$;
