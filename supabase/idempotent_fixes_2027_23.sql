-- ============================================================
-- NEX DESK — Phase 43 Stage A: a portal you can navigate
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================
--
--  ⚠  READ THIS BEFORE RUNNING — the tasks change is a judgement call.
--
--  `tasks` has never had a client-visible flag. This adds one, defaulting to
--  FALSE (= visible), which matches the "everything gets written down" promise
--  the whole site is built on. But it also means EVERY TASK YOU HAVE TODAY
--  becomes visible to that client the moment the portal ships — including any
--  blunt internal wording.
--
--  If you would rather opt in one at a time, UNCOMMENT the UPDATE below. It
--  hides everything that exists now; anything created afterwards is visible
--  unless an owner/admin marks it internal.
--
--      -- update tasks set is_internal = true;
--
-- ============================================================

-- ---------- PROJECTS -----------------------------------------

alter table projects
  -- The enum already exists (schema.sql:21) and `tasks` already uses it.
  add column if not exists priority priority_level default 'normal',

  -- What it is built with. An array rather than free text so the portal can
  -- render chips and the admin can edit them one at a time.
  add column if not exists tech_stack text[] default '{}',

  -- Deliberately NOT the same thing as `deadline`.
  --
  -- `deadline` is what was agreed and must not move quietly — it is on the
  -- signed agreement. `estimated_delivery` is where we currently think it
  -- lands. Keeping both is the point: the portal shows the two side by side and
  -- flags the gap, which is the number a client actually wants and never gets.
  add column if not exists estimated_delivery date,

  -- Plain notes written FOR the client, shown on the project's Notes tab.
  -- Owner/admin only — this is copy a client reads, so it belongs with whoever
  -- owns the relationship rather than with whoever is doing the work.
  add column if not exists client_notes text;

comment on column projects.estimated_delivery is
  'Current honest forecast. Distinct from deadline, which is the agreed contractual date and must not move silently.';

comment on column projects.client_notes is
  'Client-facing notes shown on the portal Notes tab. Owner/admin writable only.';

-- ---------- TASKS --------------------------------------------

alter table tasks
  add column if not exists is_internal boolean not null default false;

comment on column tasks.is_internal is
  'True = hidden from the client portal. Owner/admin only, so work cannot be quietly hidden from a client by the person doing it.';

-- See the warning at the top of this file before uncommenting.
-- update tasks set is_internal = true;

-- The portal reads a project's visible tasks on every Tasks tab view.
create index if not exists tasks_project_visible_idx
  on tasks (project_id, sort_order)
  where not is_internal;
