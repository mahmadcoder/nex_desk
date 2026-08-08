-- ============================================================
-- NEX DESK — Phase 45 Stage A: attendance and time tracking
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================
--
-- Nothing in the system knew WHEN somebody worked or WHERE the time went.
-- `daily_work_logs.hours_spent` was one self-reported number per day, with no
-- way to check it and no way to bill from it.
--
-- Two clocks, deliberately separate. Attendance answers "were you working
-- today". Time tracking answers "which project did the hours go to". A day with
-- no billable work still has attendance, and an hour of attendance is not
-- automatically an hour of billable work.

-- ---------- WORKING HOURS ------------------------------------
--
-- One agency-wide rule. "Late" is COMPUTED from these at read time and never
-- stored: storing it would freeze yesterday's answer against today's rule, so
-- widening the grace period from 15 to 45 minutes would leave every past
-- record still flagged under the old one.

alter table settings
  add column if not exists work_start     time not null default '09:00',
  add column if not exists work_end       time not null default '18:00',
  add column if not exists work_grace_min int  not null default 15,
  -- ISO weekday numbers: 1 = Monday … 7 = Sunday.
  add column if not exists work_days      int[] not null default '{1,2,3,4,5}';

comment on column settings.work_grace_min is
  'Minutes after work_start before an arrival counts as late. Applied at read time — see src/lib/workHours.ts.';

-- ---------- ATTENDANCE ---------------------------------------

create table if not exists attendance (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references employees(id) on delete cascade,
  work_date      date not null default current_date,
  checked_in_at  timestamptz,
  checked_out_at timestamptz,
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- One row per person per day. This is what makes a second check-in a no-op
  -- rather than a new arrival time — the arrival time must be the arrival time.
  unique (employee_id, work_date)
);

create index if not exists attendance_employee_idx on attendance (employee_id, work_date desc);
create index if not exists attendance_date_idx     on attendance (work_date desc);

comment on table attendance is
  'Presence, not billable work. Someone on approved leave is never marked absent or late — leave_requests is consulted first.';

alter table attendance enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'attendance' and policyname = 'attendance_staff_all') then
    create policy attendance_staff_all on attendance for all using (is_staff());
  end if;
end $$;

-- ---------- TIME TRACKING ------------------------------------

create table if not exists time_entries (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references employees(id) on delete cascade,
  -- Nullable: not all tracked time belongs to a task (a client call, a review).
  task_id      uuid references tasks(id) on delete set null,
  project_id   uuid references projects(id) on delete set null,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  -- Written on stop so reports never have to recompute it, and so a corrected
  -- entry can carry a duration that differs from its timestamps.
  duration_sec int,
  note         text,
  -- 'timer'  → started and stopped by a person
  -- 'manual' → entered by hand, or closed automatically by the stale-timer cap
  source       text not null default 'timer' check (source in ('timer','manual')),
  created_at   timestamptz not null default now(),

  -- A finished entry cannot end before it began.
  constraint time_entries_span_check check (ended_at is null or ended_at >= started_at)
);

-- ONE running timer per person, enforced by the database rather than by a
-- disabled button. Two timers running at once is how a working day quietly
-- becomes eleven hours, and the UI cannot be the thing that prevents it —
-- two tabs, or a stale page, and the button is not there to say no.
create unique index if not exists time_entries_one_running_idx
  on time_entries (employee_id)
  where ended_at is null;

create index if not exists time_entries_employee_day_idx on time_entries (employee_id, started_at desc);
create index if not exists time_entries_project_idx      on time_entries (project_id, started_at desc);
create index if not exists time_entries_task_idx         on time_entries (task_id);

comment on index time_entries_one_running_idx is
  'Refuses a second concurrent timer at the database level. Pause is implemented as stop-and-start, so a row is always either running or finished.';

alter table time_entries enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'time_entries' and policyname = 'time_entries_staff_all') then
    create policy time_entries_staff_all on time_entries for all using (is_staff());
  end if;
end $$;

-- ---------- THE DAILY LOG'S HOURS ----------------------------
--
-- The log stays the narrative; the timer supplies the figure. Recording which
-- one a number came from is what makes a person who adjusts every single day
-- visible, without anybody being accused of anything.

alter table daily_work_logs
  add column if not exists hours_source text not null default 'manual'
    check (hours_source in ('manual','tracked','adjusted')),
  -- Kept when a tracked figure is overridden, so the original is not lost.
  add column if not exists hours_tracked numeric(5,2);

comment on column daily_work_logs.hours_source is
  'manual = typed with no timer running that day · tracked = accepted the timer total · adjusted = timer total was edited, see hours_tracked for the original.';
