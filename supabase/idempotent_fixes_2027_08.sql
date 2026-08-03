-- ============================================================
-- NEX DESK — THE CHASERS (2027-08)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_07.sql
--
-- The problem this solves:
--   The kickoff checklist fixed silence at the START of a project. The same
--   disease sat untreated in the middle and at the end, and the emails for it
--   were already written and had never once been sent:
--
--     staging_ready       — a staging link was set and the client was never told
--     feedback_needed     — nothing chased a review that went quiet
--     project_on_hold     — a project was paused with no written confirmation
--     testimonial_request — a project was handed over and never asked about
--
--   All four existed in email_templates.sql from launch with zero code paths
--   behind them. These columns are the state those chases need.
-- ============================================================

do $$
begin
  if to_regclass('public.projects') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. REVIEW STATE
-- ------------------------------------------------------------

alter table if exists public.projects
  add column if not exists staging_shared_at     timestamptz,
  add column if not exists feedback_nudged_at    timestamptz,
  add column if not exists feedback_nudge_count  int not null default 0,
  add column if not exists paused_at             timestamptz,
  add column if not exists testimonial_requested_at timestamptz;

comment on column public.projects.staging_shared_at is
  'When the client was emailed the staging link. Starts the review clock; the cron chases silence from three days later.';
comment on column public.projects.feedback_nudged_at is
  'Last chase for review feedback. Throttles the nudge to one a week.';
comment on column public.projects.feedback_nudge_count is
  'How many review chases have gone out. Capped at 3 — past that it is a phone call, not another email.';
comment on column public.projects.paused_at is
  'When the project went on hold. Cleared when it moves off hold, so a second pause is confirmed to the client again.';
comment on column public.projects.testimonial_requested_at is
  'When the testimonial ask went out. Set once, ever — nobody should be asked twice.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_feedback_nudge_check') then
    alter table public.projects
      add constraint projects_feedback_nudge_check
      check (feedback_nudge_count >= 0 and feedback_nudge_count <= 10);
  end if;
end $$;


-- ------------------------------------------------------------
-- 2. INDEXES FOR THE CRON SWEEPS
--
-- Both run daily over every project. Partial indexes keep them reading only
-- the rows that can possibly qualify.
-- ------------------------------------------------------------

create index if not exists idx_projects_awaiting_feedback
  on public.projects (staging_shared_at)
  where staging_shared_at is not null;

create index if not exists idx_projects_testimonial_due
  on public.projects (handed_over_at)
  where handed_over_at is not null and testimonial_requested_at is null;


-- ------------------------------------------------------------
-- 3. BACKFILL
--
-- Projects that already have a staging link were never told about it, and the
-- share date is unknowable. Deliberately left NULL rather than guessed: a
-- fabricated date would make the cron fire a "you have gone quiet" chase at a
-- client who was never asked anything in the first place.
--
-- Setting a staging URL from now on starts the clock properly. To start it for
-- an existing project, clear the staging URL, save, then paste it back.
-- ------------------------------------------------------------

-- Already-handed-over projects are marked as asked, so switching this on does
-- not email every past client a testimonial request at once.
update public.projects
set testimonial_requested_at = coalesce(handed_over_at, now())
where handed_over_at is not null
  and testimonial_requested_at is null;

-- Projects sitting on hold today keep an honest paused_at without re-emailing.
update public.projects
set paused_at = coalesce(updated_at, now())
where status = 'on_hold'
  and paused_at is null;


-- ------------------------------------------------------------
-- 4. REPORT
-- ------------------------------------------------------------

do $$
declare in_review int; suppressed int; paused int;
begin
  select count(*) into in_review   from public.projects where staging_shared_at is not null;
  select count(*) into suppressed  from public.projects where testimonial_requested_at is not null;
  select count(*) into paused      from public.projects where paused_at is not null;

  raise notice '------------------------------------------------------';
  raise notice 'Chasers ready.';
  raise notice '  projects with a shared staging link: %', in_review;
  raise notice '  past handovers marked as already asked: %', suppressed;
  raise notice '  projects on hold: %', paused;
  raise notice '';
  raise notice 'From now on: setting a staging URL emails the client and';
  raise notice 'starts the review clock. Silence is chased from day 3,';
  raise notice 'weekly, three times, then left alone.';
  raise notice '';
  raise notice 'A testimonial is asked for 14 days after handover, once.';
  raise notice 'Past handovers were marked as asked so nobody is emailed';
  raise notice 'about a project that finished months ago.';
  raise notice '------------------------------------------------------';
end $$;
