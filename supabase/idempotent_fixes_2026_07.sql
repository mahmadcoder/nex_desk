-- ============================================================
-- NEX DESK — CONSOLIDATED INTEGRITY FIXES (2026-07)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Fixes:
--   1. client_employee_assignments.client_id pointed at profiles(id)
--      while the whole app passes clients.id  → every read returned 0 rows
--   2. Duplicate assignments (unique constraint never fired on NULL project_id)
--   3. Duplicate lead → client conversions
--   4. Missing columns read by the app (projects.credentials, work-log
--      client-visibility, employees portal credentials)
--   5. employees.status casing mismatch ('active' vs 'Active')
--   6. Portal clients could not upload signed agreements (storage RLS)
--   7. Notification address still seeded to hello@nexdesk.com
-- ============================================================


-- ------------------------------------------------------------
-- 0. PRECONDITIONS
--
-- This file patches tables created by earlier migrations. Fail with a clear
-- message rather than a confusing "relation does not exist" halfway through.
-- ------------------------------------------------------------

do $$
declare
  missing text := '';
begin
  if to_regclass('public.clients') is null then
    missing := missing || ' schema.sql';
  end if;
  if to_regclass('public.client_employee_assignments') is null
     or to_regclass('public.employees') is null then
    missing := missing || ' idempotent_employees_schema.sql';
  end if;
  if to_regclass('public.daily_work_logs') is null then
    missing := missing || ' idempotent_daily_logs.sql';
  end if;

  if missing <> '' then
    raise exception
      'Run these file(s) first, then re-run this one:%', missing;
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. REPOINT client_employee_assignments.client_id → clients(id)
-- ------------------------------------------------------------

-- 1a. Drop whatever foreign key currently sits on client_id, whatever it is named.
do $$
declare
  fk_name text;
begin
  for fk_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'client_employee_assignments'
      and con.contype = 'f'
      and con.conkey = array[
        (select attnum from pg_attribute
          where attrelid = con.conrelid and attname = 'client_id')
      ]
  loop
    execute format(
      'alter table public.client_employee_assignments drop constraint %I', fk_name
    );
    raise notice 'Dropped old FK % on client_employee_assignments.client_id', fk_name;
  end loop;
end $$;


-- 1b. Remap rows written under a profile id back to the owning clients.id.
--     Only touches rows whose client_id is NOT already a valid clients.id.
update public.client_employee_assignments a
set    client_id = c.id
from   public.clients c
where  c.profile_id = a.client_id
  and  not exists (select 1 from public.clients c2 where c2.id = a.client_id);


-- 1c. Remapping can collapse two rows onto the same pair — keep the oldest.
delete from public.client_employee_assignments a
using public.client_employee_assignments b
where a.ctid > b.ctid
  and a.client_id = b.client_id
  and a.employee_id = b.employee_id
  and a.project_id is not distinct from b.project_id;


-- 1d. Drop rows that still point at nothing (client deleted, or a profile
--     with no clients row). Nothing references these, so they are safe to remove.
delete from public.client_employee_assignments a
where not exists (select 1 from public.clients c where c.id = a.client_id);


-- 1e. Attach the correct foreign key.
alter table public.client_employee_assignments
  add constraint client_employee_assignments_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete cascade;


-- ------------------------------------------------------------
-- 2. MAKE THE DUPLICATE GUARD ACTUALLY FIRE
--
-- unique(client_id, employee_id, project_id) never fired for the app's real
-- insert shape, because project_id is always NULL and Postgres treats NULLs
-- as distinct. A partial unique index covers the NULL case.
-- ------------------------------------------------------------

create unique index if not exists uniq_assignment_client_employee_no_project
  on public.client_employee_assignments (client_id, employee_id)
  where project_id is null;

create unique index if not exists uniq_assignment_client_employee_project
  on public.client_employee_assignments (client_id, employee_id, project_id)
  where project_id is not null;


-- ------------------------------------------------------------
-- 3. RLS — clients read their own assigned team
--
-- The old policy joined client_employee_assignments.client_id = auth.uid(),
-- which is wrong now that client_id holds a clients.id.
-- ------------------------------------------------------------

drop policy if exists "clients read assigned employees" on public.employees;
create policy "clients read assigned employees" on public.employees for select using (
  id in (
    select a.employee_id
    from public.client_employee_assignments a
    join public.clients c on c.id = a.client_id
    where c.profile_id = auth.uid()
  )
);

drop policy if exists "clients read own assignments" on public.client_employee_assignments;
create policy "clients read own assignments" on public.client_employee_assignments for select using (
  client_id in (select id from public.clients where profile_id = auth.uid())
);


-- ------------------------------------------------------------
-- 4. PREVENT DOUBLE LEAD → CLIENT CONVERSION
--
-- Existing duplicates are REPORTED, not deleted — a duplicate client may
-- already own deals, projects and invoices that would cascade away.
-- Merge or delete them by hand, then re-run this file.
-- ------------------------------------------------------------

do $$
declare
  dup_count int;
  dup_list  text;
begin
  select count(*), string_agg(distinct lead_id::text, ', ')
    into dup_count, dup_list
  from (
    select lead_id
    from public.clients
    where lead_id is not null
    group by lead_id
    having count(*) > 1
  ) d;

  if coalesce(dup_count, 0) = 0 then
    create unique index if not exists uniq_clients_lead_id
      on public.clients (lead_id) where lead_id is not null;
  else
    raise warning
      'Skipped uniq_clients_lead_id: % lead(s) already converted more than once (lead_id: %). Merge the duplicate client rows, then re-run this migration.',
      dup_count, dup_list;
  end if;
end $$;


-- ------------------------------------------------------------
-- 5. COLUMNS THE APP READS BUT THE SCHEMA NEVER CREATED
-- ------------------------------------------------------------

-- Handover PDF reads project.credentials (lib/pdf/generate.ts) — never existed,
-- so the "Accounts and access" table always rendered empty.
alter table public.projects
  add column if not exists credentials jsonb not null default '[]'::jsonb;

-- Work logs become the source of the client-facing project timeline.
alter table public.daily_work_logs
  add column if not exists client_visible boolean not null default false,
  add column if not exists progress_delta int not null default 0;

create index if not exists idx_daily_work_logs_client_visible
  on public.daily_work_logs (project_id, work_date desc)
  where client_visible;

-- Employees get real logins (staff role), so they need the same credential
-- fields clients already have.
alter table public.employees
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists portal_password_preview text;

create index if not exists idx_employees_user_id on public.employees (user_id);
create index if not exists idx_employees_email   on public.employees (lower(email));


-- ------------------------------------------------------------
-- 6. NORMALISE employees.status CASING
--
-- The column defaults to 'Active' but the daily-logs page filtered on
-- lowercase 'active' and matched nothing.
-- ------------------------------------------------------------

update public.employees set status = 'Active'     where lower(status) = 'active';
update public.employees set status = 'On Leave'   where lower(status) in ('on leave', 'on_leave');
update public.employees set status = 'Terminated' where lower(status) = 'terminated';
update public.employees set status = 'Active'     where status is null or btrim(status) = '';


-- ------------------------------------------------------------
-- 7. STORAGE — LET PORTAL CLIENTS UPLOAD THEIR SIGNED AGREEMENTS
--
-- Only "staff manage documents" existed on the documents bucket, so a
-- portal client's upload was rejected by RLS before it ever reached the
-- server action.
-- ------------------------------------------------------------

drop policy if exists "clients upload signed documents" on storage.objects;
create policy "clients upload signed documents" on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'signed-agreements'
    and exists (select 1 from public.clients c where c.profile_id = auth.uid())
  );

drop policy if exists "clients read own signed documents" on storage.objects;
create policy "clients read own signed documents" on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'signed-agreements'
    and (storage.foldername(name))[2] in (
      select c.id::text from public.clients c where c.profile_id = auth.uid()
    )
  );


-- ------------------------------------------------------------
-- 8. SINGLE NOTIFICATION ADDRESS
--
-- Notifications were split between settings.email (seeded hello@nexdesk.com)
-- and process.env.GMAIL_USER. settings.email is now the single source.
-- ------------------------------------------------------------

insert into public.settings (id, email) values (1, 'ahmadsadiq.dev@gmail.com')
on conflict (id) do update
  set email = 'ahmadsadiq.dev@gmail.com'
  where public.settings.email is null
     or public.settings.email in ('hello@nexdesk.com', 'hello@nexdesk.agency');


-- ------------------------------------------------------------
-- DONE — quick verification
-- ------------------------------------------------------------
do $$
declare
  fk_target text;
  orphans   int;
begin
  select cl.relname into fk_target
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_class cl  on cl.oid  = con.confrelid
  where rel.relname = 'client_employee_assignments'
    and con.conname = 'client_employee_assignments_client_id_fkey';

  select count(*) into orphans
  from public.client_employee_assignments a
  where not exists (select 1 from public.clients c where c.id = a.client_id);

  raise notice 'client_employee_assignments.client_id now references: % (expected: clients)', fk_target;
  raise notice 'orphaned assignment rows: % (expected: 0)', orphans;
end $$;
