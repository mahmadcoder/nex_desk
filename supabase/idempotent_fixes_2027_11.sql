-- ============================================================
-- NEX DESK — NOTIFICATION CENTRE (2027-11)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_10.sql
--
-- The problem this solves:
--   When a client accepts an agreement, approves a milestone, ticks a kickoff
--   item or raises a change request, the only trace is an email. Some of those
--   do not even send one — ticking a single kickoff item notified nobody at
--   all; only the final tick did. So the answer to "what happened on my
--   account today" lived in an inbox, mixed in with everything else.
--
--   This is the in-app record: one row per event worth knowing about, with
--   read state, so it can be dealt with and marked done.
--
-- Two decisions worth explaining:
--
--   'admins' is ONE row seen by every owner/admin, not one row per person.
--   Read state is therefore shared — when one of you reads it, it is read for
--   everyone, and `read_by` records who. For a small team that is more correct
--   than per-person state: the real question is "has anyone dealt with this",
--   not "have I personally seen it".
--
--   `actor_label` stores a NAME, not an id. The list then renders in a single
--   query with no joins, and a client renamed later keeps the name they had at
--   the time — which is what a log should do.
-- ============================================================

do $$
begin
  if to_regclass('public.employees') is null then
    raise exception 'Run supabase/idempotent_employees_schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. THE TABLE
-- ------------------------------------------------------------

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),

  -- WHO IT IS FOR
  -- 'admins'   → every owner/admin shares this one row
  -- 'employee' → one named person, employee_id must be set
  audience     text not null default 'admins',
  employee_id  uuid references public.employees(id) on delete cascade,

  -- WHAT HAPPENED
  kind         text not null,          -- 'agreement.accepted', 'leave.requested', …
  title        text not null,          -- one line, already written for a human
  body         text,

  -- WHERE TO GO
  href         text,                   -- app-relative link, stored not derived
  entity       text,                   -- mirrors audit_log.entity
  entity_id    uuid,

  -- WHO DID IT
  actor_label  text,                   -- a NAME, never an id
  actor_kind   text,                   -- 'client' | 'staff' | 'system'
  client_id    uuid references public.clients(id) on delete set null,

  -- STATE
  read_at      timestamptz,
  read_by      uuid references public.profiles(id) on delete set null,

  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

comment on table public.notifications is
  'In-app record of things worth knowing about. Written by notify() in src/lib/actions/notify.ts; never the transport for email — that is email_log.';
comment on column public.notifications.audience is
  '''admins'' is a single shared row for every owner/admin. ''employee'' is addressed to one person via employee_id.';
comment on column public.notifications.actor_label is
  'The name as it was when this happened. Denormalised on purpose: the list renders without joins and history does not rewrite itself.';
comment on column public.notifications.read_at is
  'Shared for the admin audience — one of you reading it clears it for all, and read_by records who.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'notifications_audience_check') then
    alter table public.notifications
      add constraint notifications_audience_check
      check (
        (audience = 'admins'   and employee_id is null) or
        (audience = 'employee' and employee_id is not null)
      );
  end if;
end $$;


-- ------------------------------------------------------------
-- 2. INDEXES
--
-- Two reads: the unread badge on every admin page load, and one person's
-- inbox. The badge one is partial so it stays small no matter how much
-- history accumulates.
-- ------------------------------------------------------------

create index if not exists idx_notifications_unread
  on public.notifications (created_at desc)
  where read_at is null;

create index if not exists idx_notifications_inbox
  on public.notifications (audience, employee_id, created_at desc);


-- ------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
--
-- Staff-only, like every other internal table. Clients never read this — they
-- already receive an email for every event that generates a row, and their
-- portal shows the same things in context where they are actionable.
-- ------------------------------------------------------------

alter table public.notifications enable row level security;
drop policy if exists "staff manage notifications" on public.notifications;
create policy "staff manage notifications" on public.notifications
  for all using (is_staff()) with check (is_staff());


-- ------------------------------------------------------------
-- 4. REPORT
-- ------------------------------------------------------------

do $$
declare total int; unread int;
begin
  select count(*) into total  from public.notifications;
  select count(*) into unread from public.notifications where read_at is null;

  raise notice '------------------------------------------------------';
  raise notice 'Notifications ready.  rows: %   unread: %', total, unread;
  raise notice '';
  raise notice 'A Notifications entry appears in the sidebar with an unread';
  raise notice 'count. You are told when a client accepts an agreement,';
  raise notice 'approves a milestone, ticks ANY kickoff item, raises a change';
  raise notice 'request or uploads a document — and when staff file a work log';
  raise notice 'or request leave.';
  raise notice '';
  raise notice 'Staff receive only two of their own: a task assigned to them,';
  raise notice 'and a decision on their leave.';
  raise notice '------------------------------------------------------';
end $$;
