-- ============================================================
-- NEX DESK — Phase 46: task attachments and ratings
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================

-- ---------- TASK ATTACHMENTS ---------------------------------
--
-- A column on `project_files` rather than a `task_files` table and a second
-- bucket. That table already carries the storage path, the visibility flag, the
-- signing helper and the upload panel — a parallel mechanism would be two
-- things to keep in step, and the day they diverge is the day an internal file
-- becomes visible because it was attached to a task instead of a project.
--
-- `on delete set null`, not cascade: deleting a task must not delete the design
-- file somebody attached to it. The file falls back to belonging to the project.

alter table project_files
  add column if not exists task_id uuid references tasks(id) on delete set null;

create index if not exists project_files_task_idx
  on project_files (task_id)
  where task_id is not null;

comment on column project_files.task_id is
  'Optional. A task attachment is still a project file and still obeys visible_to_client — attaching to a task is not a way around that.';

-- ---------- RATINGS ------------------------------------------
--
-- Captured at handover, which is the one moment the work is finished and fresh
-- enough to judge honestly.
--
-- Written by owner/admin only, and a staff member ever sees only their OWN
-- average. Never an individual score, never who gave it: a rating that can be
-- traced back to a person stops being an honest rating.

create table if not exists project_ratings (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  score       int  not null check (score between 1 and 5),
  note        text,
  rated_by    uuid references profiles(id),
  created_at  timestamptz not null default now(),

  -- One score per person per project. Re-rating updates rather than stacking,
  -- so an average cannot be moved by scoring the same project twice.
  unique (project_id, employee_id)
);

create index if not exists project_ratings_employee_idx on project_ratings (employee_id);

comment on table project_ratings is
  'Admin scores a team member 1-5 on a delivered project. Staff see only their own average, never a single score and never the rater.';

alter table project_ratings enable row level security;

-- Read through the service-role client only, like every other sensitive table;
-- the scoping to "your own average" is done in lib/insights.ts.
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'project_ratings' and policyname = 'project_ratings_staff_all') then
    create policy project_ratings_staff_all on project_ratings for all using (is_staff());
  end if;
end $$;
