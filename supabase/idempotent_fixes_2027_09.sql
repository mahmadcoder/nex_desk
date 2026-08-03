-- ============================================================
-- NEX DESK — STAFF TASKS (2027-09)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_08.sql
--
-- The problem this solves:
--   The `tasks` table has existed since launch — with a status enum, priority,
--   due dates and RLS — and not one line of code has ever read or written it.
--   Staff record work AFTER doing it, in daily_work_logs. Nothing anywhere
--   hands work OUT. So "who is doing what this week" lived only in WhatsApp.
--
--   This is built to sit ALONGSIDE the conversation, not replace it. The board
--   is where a decision is remembered; the chat is where it is made.
--
-- The one real fix here:
--   `tasks.assigned_to` references profiles(id). Every other staff-facing
--   table in this app keys off employees(id) — daily_work_logs.employee_id,
--   client_employee_assignments.employee_id, and `CurrentStaff.employeeId`.
--   Assigning by profile would have meant the staff dashboard could never
--   match a task to the person looking at it. A new column fixes that without
--   disturbing the old one.
-- ============================================================

do $$
begin
  if to_regclass('public.tasks') is null then
    raise exception 'Run supabase/schema.sql first.';
  end if;
  if to_regclass('public.employees') is null then
    raise exception 'Run supabase/idempotent_employees_schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. ASSIGN BY EMPLOYEE, NOT BY PROFILE
-- ------------------------------------------------------------

alter table if exists public.tasks
  add column if not exists assigned_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists done_at    timestamptz,
  add column if not exists done_by    uuid references public.employees(id) on delete set null,
  -- Which daily work log closed it. This is what stops the board being a
  -- second chore: staff tick tasks off inside the log they already write.
  add column if not exists done_via_log_id uuid references public.daily_work_logs(id) on delete set null,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

comment on column public.tasks.assigned_employee_id is
  'Who is doing this. Keyed to employees(id) like every other staff table — the older assigned_to (profiles) is left in place but unused.';
comment on column public.tasks.done_at is
  'When it was finished. Set by ticking it off, either on the project board or from inside a daily work log.';
comment on column public.tasks.done_via_log_id is
  'The work log that closed it, when it was closed that way. Keeps the board current as a side effect of work staff already record.';

-- Best-effort carry-over for any task assigned the old way. employees.user_id
-- and profiles.id are both the auth user, which is what makes this resolvable.
update public.tasks t
set assigned_employee_id = e.id
from public.employees e
where t.assigned_employee_id is null
  and t.assigned_to is not null
  and e.user_id = t.assigned_to;


-- ------------------------------------------------------------
-- 2. INDEXES
--
-- The two reads that matter: one person's open work, and one project's board.
-- ------------------------------------------------------------

create index if not exists idx_tasks_mine
  on public.tasks (assigned_employee_id, status, due_date)
  where status <> 'done';

create index if not exists idx_tasks_project
  on public.tasks (project_id, sort_order);


-- ------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
--
-- RLS was enabled on this table at launch. Whether a policy was ever created
-- alongside it is not worth guessing at — with none, the table denies
-- everything, which is invisible while nothing reads it and very confusing the
-- moment something does.
-- ------------------------------------------------------------

alter table public.tasks enable row level security;
drop policy if exists "staff manage tasks" on public.tasks;
create policy "staff manage tasks" on public.tasks
  for all using (is_staff()) with check (is_staff());


-- ------------------------------------------------------------
-- 4. REPORT
-- ------------------------------------------------------------

do $$
declare total int; open_tasks int; assigned int;
begin
  select count(*) into total       from public.tasks;
  select count(*) into open_tasks  from public.tasks where status <> 'done';
  select count(*) into assigned    from public.tasks where assigned_employee_id is not null;

  raise notice '------------------------------------------------------';
  raise notice 'Tasks ready.  total: %   open: %   assigned: %', total, open_tasks, assigned;
  raise notice '';
  raise notice 'Add tasks from a project page — title, who, and a due date.';
  raise notice 'Staff see theirs on their own dashboard, and can tick them';
  raise notice 'off from inside the daily work log they already write, so';
  raise notice 'the board stays current without being a second chore.';
  raise notice '';
  raise notice 'Nothing depends on this. A project with no tasks looks';
  raise notice 'exactly as it did before.';
  raise notice '------------------------------------------------------';
end $$;
