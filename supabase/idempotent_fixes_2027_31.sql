-- ============================================================
-- NEX DESK — Phase 50: budgets, archiving, recurring tasks
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================

-- ---------- PROJECT BUDGET & ARCHIVE -------------------------
--
-- A project's PRICE has always been known (the deal total). What it COSTS to
-- deliver was only ever visible on the Profitability page, agency-wide and
-- after the fact. A budget on the project is the number that lets somebody
-- notice a job is losing money while there is still time to do something.

alter table projects
  -- Internal delivery budget, NOT the client price. The two are deliberately
  -- different: the price is on a signed agreement, this is what we are willing
  -- to spend producing it.
  add column if not exists budget numeric(12,2),
  add column if not exists budget_currency text,

  -- Soft archive. `status = 'completed'` says the work finished; this says
  -- "stop showing me this". A finished project that is still being invoiced
  -- must not disappear, which is why it is a separate flag rather than a
  -- status value.
  add column if not exists archived_at timestamptz;

create index if not exists projects_active_idx
  on projects (created_at desc)
  where archived_at is null;

comment on column projects.budget is
  'Internal cost budget for delivering the work. Never the client price — that is deals.total.';

comment on column projects.archived_at is
  'Soft archive: hidden from the default project list. Separate from status so a completed-but-unpaid project stays visible.';

-- ---------- RECURRING TASKS ----------------------------------
--
-- A recurring task is a TEMPLATE that spawns copies; the template itself is
-- never worked on and never completed. The alternative — reopening a finished
-- task every week — destroys the record of what was actually done when.

alter table tasks
  add column if not exists recurrence text
    check (recurrence is null or recurrence in ('daily','weekly','monthly')),
  -- Stop date. Null means it runs until somebody turns it off.
  add column if not exists recurrence_until date,
  -- True on the template. Templates are excluded from every board and count.
  add column if not exists is_recurring_template boolean not null default false,
  -- Which template produced this copy.
  add column if not exists spawned_from uuid references tasks(id) on delete set null,
  -- The last occurrence date already created. This is what makes the cron
  -- idempotent: running it twice in one day spawns nothing the second time.
  add column if not exists last_spawned_on date;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_template_has_recurrence') then
    alter table tasks
      add constraint tasks_template_has_recurrence
      -- A template with no rule would sit there producing nothing forever.
      check (not is_recurring_template or recurrence is not null);
  end if;
end $$;

create index if not exists tasks_recurring_due_idx
  on tasks (last_spawned_on)
  where is_recurring_template;

comment on column tasks.last_spawned_on is
  'Guards against double-spawning. The cron only creates an occurrence when the next due date is after this.';

-- Existing boards must not suddenly show templates: nothing is a template yet,
-- and the default is false, so this is a no-op today and correct tomorrow.
