-- ============================================================
-- NEX DESK — Phase 47: audit visibility and lead attribution
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================

-- ---------- AUDIT LOG ----------------------------------------
--
-- `audit_log` has recorded roughly forty actions since launch — client.update,
-- deal.won, project_file.delete, email.resend — and the only thing that ever
-- read it was clientActivity(), scoped to one client. There was no viewer, so
-- "who deleted that file" was unanswerable despite the answer being in the
-- table the whole time.
--
-- These indexes are what make the viewer usable a year from now: forty actions
-- a day is roughly fifteen thousand rows, and the two questions asked of it are
-- always "lately" and "by whom".

create index if not exists audit_log_recent_idx
  on audit_log (created_at desc);

create index if not exists audit_log_actor_idx
  on audit_log (actor_id, created_at desc);

create index if not exists audit_log_entity_idx
  on audit_log (entity, created_at desc);

comment on column audit_log.meta is
  'Before/after values for the change. Rendered as a readable diff by /nx-control/audit — never expected to hold a password, token or session id.';

-- ---------- LEAD ATTRIBUTION ---------------------------------
--
-- `leads.source` was hardcoded to 'website' at the only place it is written, so
-- with sixteen service pages there was no way to tell which one earns money.

alter table leads
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  -- Where the browser came FROM. Distinct from utm_source, which is what the
  -- link claimed — a link can claim anything, the referrer is observed.
  add column if not exists referrer     text,
  -- The page the form was submitted on, which is the one that did the work.
  add column if not exists landing_page text;

create index if not exists leads_attribution_idx
  on leads (utm_source, created_at desc);

create index if not exists leads_landing_idx
  on leads (landing_page)
  where landing_page is not null;

comment on column leads.referrer is
  'document.referrer at submit time. Observed, unlike utm_source which is whatever the link said.';
