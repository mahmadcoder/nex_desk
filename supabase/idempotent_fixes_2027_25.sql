-- ============================================================
-- NEX DESK — Phase 44: clients can finally be notified
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================

-- ---------- CLIENT NOTIFICATIONS -----------------------------
--
-- `notifications_audience_check` allowed exactly two audiences, 'admins' and
-- 'employee', so every event in the system was addressed to staff and there was
-- no way to tell a client anything except by email.
--
-- `client_id` already existed on the table as context. This makes it an
-- addressee.

alter table public.notifications
  drop constraint if exists notifications_audience_check;

alter table public.notifications
  add constraint notifications_audience_check
  check (
    (audience = 'admins'   and employee_id is null) or
    (audience = 'employee' and employee_id is not null) or
    -- A client notification with no client is unreachable: nobody could ever
    -- read it and it would sit unread forever, inflating every count.
    (audience = 'client'   and client_id is not null)
  );

comment on column public.notifications.audience is
  'admins = shared by every owner/admin · employee = one named person · client = one client, read in their portal.';

-- The portal bell asks this on every page load.
create index if not exists notifications_client_idx
  on public.notifications (client_id, created_at desc)
  where audience = 'client';

create index if not exists notifications_client_unread_idx
  on public.notifications (client_id)
  where audience = 'client' and read_at is null;

-- ---------- FILE CATEGORIES ----------------------------------
--
-- The categories a client thinks in — Proposal, Contract, NDA, UI Design,
-- Source Code, Assets — span two tables. Proposal/Contract/Invoice are
-- generated PDFs in `documents` (see documents.type); the rest are uploads.
-- The portal merges both, so this only has to cover the upload side.

alter table project_files
  add column if not exists kind text not null default 'other';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'project_files_kind_check') then
    alter table project_files
      add constraint project_files_kind_check
      check (kind in ('proposal','contract','nda','design','source','assets','other'));
  end if;
end $$;

comment on column project_files.kind is
  'Client-facing category. Generated PDFs are categorised from documents.type instead — see loadProjectFileGroups.';

create index if not exists project_files_kind_idx
  on project_files (project_id, kind);

-- ---------- MEETING NOTES ------------------------------------

alter table meetings
  -- Written AFTER the call. `agenda` is written before it, and collapsing the
  -- two would mean overwriting what was promised with what happened.
  add column if not exists notes text;

alter table meetings
  -- Stamped when the 24-hour reminder goes out. Without it a manual re-trigger
  -- or a retry of the daily cron reminds the same client about the same call
  -- twice, which reads as disorganised rather than attentive.
  add column if not exists reminded_at timestamptz;

create index if not exists meetings_reminder_due_idx
  on meetings (starts_at)
  where status = 'scheduled' and reminded_at is null;

comment on column meetings.notes is
  'What was decided, written after the meeting. Visible to the client. Distinct from agenda.';

-- ---------- HOUSEKEEPING -------------------------------------
--
-- `packages` was superseded by services.pricing_tiers and has never had a
-- single line of code reading or writing it. Dropped so the schema stops
-- implying a feature that does not exist.
--
-- Guarded rather than a bare DROP: if anything was ever added that references
-- it, this reports instead of cascading.

do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'packages') then
    begin
      drop table public.packages restrict;
      raise notice 'Dropped obsolete table: packages';
    exception when dependent_objects_still_exist then
      raise notice 'packages still has dependents — left in place. Investigate before dropping.';
    end;
  end if;
end $$;
