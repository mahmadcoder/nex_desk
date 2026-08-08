-- ============================================================
-- NEX DESK — Phase 43 Stage B: meetings, files, messages
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================
--
-- `messages` and `project_files` have existed in schema.sql since the
-- beginning with ZERO lines of code behind them, and the `project-files`
-- storage bucket was created and never used. This turns all three on and adds
-- the one genuinely new table.

-- ---------- MEETINGS -----------------------------------------

create table if not exists meetings (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  -- Optional: a kickoff call belongs to the relationship, not to one project.
  project_id   uuid references projects(id) on delete set null,
  title        text not null,
  agenda       text,
  starts_at    timestamptz not null,
  duration_min int not null default 30,
  -- Zoom / Meet / Whereby. No provider integration — a pasted link works with
  -- every tool a client already has, and cannot break when an API changes.
  join_url     text,
  status       text not null default 'scheduled'
                 check (status in ('scheduled','cancelled','completed')),
  -- Bumped on every reschedule. Calendar clients ignore an update whose
  -- SEQUENCE has not increased, so without this a moved meeting silently keeps
  -- its old time in the attendee's calendar.
  sequence     int not null default 0,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists meetings_client_idx  on meetings (client_id, starts_at desc);
create index if not exists meetings_project_idx on meetings (project_id, starts_at desc);
-- The dashboard question is always "what is next", never "what was".
create index if not exists meetings_upcoming_idx
  on meetings (starts_at)
  where status = 'scheduled';

comment on column meetings.sequence is
  'iCalendar SEQUENCE. Must increase on every reschedule or attendee calendars ignore the update.';

alter table meetings enable row level security;

-- Read through the service-role client only, exactly like every other portal
-- table. No anon policy is created on purpose.
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'meetings' and policyname = 'meetings_staff_all') then
    create policy meetings_staff_all on meetings for all using (is_staff());
  end if;
end $$;

-- ---------- MESSAGES -----------------------------------------

-- The table exists; these are what it needs to be usable.
alter table messages
  -- profiles.id covers staff. A client writing in the portal has no profiles
  -- row, so the sender is recorded by kind and name instead of being NULL and
  -- unattributable.
  add column if not exists sender_kind text not null default 'staff'
    check (sender_kind in ('staff','client')),
  add column if not exists sender_name text;

create index if not exists messages_project_idx on messages (project_id, created_at);
-- Powers the unread badge without scanning the thread.
create index if not exists messages_unread_idx
  on messages (project_id)
  where read_at is null;

-- ---------- PROJECT FILES ------------------------------------

alter table project_files
  -- So a client can see why a file was shared without asking.
  add column if not exists description text;

create index if not exists project_files_project_idx
  on project_files (project_id, created_at desc);
create index if not exists project_files_client_visible_idx
  on project_files (project_id, created_at desc)
  where visible_to_client;
