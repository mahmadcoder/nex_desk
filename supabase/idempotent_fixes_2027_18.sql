-- ============================================================
-- NEX DESK — PHOTO HISTORY & PROFILE CHANGE TRACKING (2027-18)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2027_17.sql
--
-- Phase 29 gave staff the ability to set their own photo. A staff member then
-- removed theirs, and it silently disappeared from the client portal — the
-- agency's face on a client-facing page, gone, with nothing recorded and
-- nobody told.
--
-- Two changes here:
--
--   1. Every photo a person ever sets is kept. The files themselves were
--      never actually deleted — uploadPublicAsset writes a new timestamped
--      name each time and nothing in the app has ever called storage.remove()
--      — so only the URL pointer was being lost. This table keeps the pointers.
--
--   2. Removing a photo no longer clears it. It raises a request the admin
--      answers. REPLACING is untouched and still applies immediately: the
--      point is that a face cannot vanish from a client's portal unnoticed,
--      not to put a gate in front of ordinary updates.
-- ============================================================

do $$
begin
  if to_regclass('public.employees') is null then
    raise exception 'Run supabase/schema.sql and idempotent_employees_schema.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. EVERY PHOTO EVER SET
-- ------------------------------------------------------------
create table if not exists public.employee_photo_history (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  -- null means this entry recorded a REMOVAL rather than a new photo.
  photo_url     text,
  previous_url  text,
  -- profiles.id of whoever made the change. No FK: a self-serve change by an
  -- employee with no profiles row would otherwise fail the insert, and losing
  -- the history entry is worse than losing the attribution.
  changed_by    uuid,
  changed_by_self boolean not null default true,
  created_at    timestamptz not null default now()
);

comment on table public.employee_photo_history is
  'Every profile photo an employee has set, including removals. Admin-only — nothing in the staff role reads this.';

create index if not exists idx_photo_history_employee
  on public.employee_photo_history (employee_id, created_at desc);

alter table public.employee_photo_history enable row level security;

-- Staff roles can read the table at the SQL level, but every app query runs
-- through the service-role client on admin-only pages. Kept consistent with
-- audit_log and notifications, which are staff-readable at this layer too.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'employee_photo_history'
      and policyname = 'staff manage photo history'
  ) then
    create policy "staff manage photo history" on public.employee_photo_history
      for all using (is_staff());
  end if;
end $$;


-- ------------------------------------------------------------
-- 2. A REMOVAL THE ADMIN HAS TO AGREE TO
-- ------------------------------------------------------------
alter table if exists public.employees
  add column if not exists avatar_removal_requested_at timestamptz;

comment on column public.employees.avatar_removal_requested_at is
  'Set when an employee asks for their photo to come down. avatar_url is deliberately NOT cleared until an admin confirms, so a client-facing portal never loses a face silently.';

create index if not exists idx_employees_avatar_removal
  on public.employees (avatar_removal_requested_at desc)
  where avatar_removal_requested_at is not null;


-- ------------------------------------------------------------
-- 3. SEED THE HISTORY WITH WHAT IS ON SCREEN TODAY
-- ------------------------------------------------------------
-- Without this the first change to an existing photo would record a
-- `previous_url` that appears in no history row, so the gallery would be
-- missing the photo everyone can currently see. Older photos than this are in
-- the bucket but cannot be attributed to a person, so they stay unlisted.
insert into public.employee_photo_history (employee_id, photo_url, previous_url, changed_by_self, created_at)
select e.id, e.avatar_url, null, false, coalesce(e.created_at, now())
from public.employees e
where e.avatar_url is not null
  and not exists (
    select 1 from public.employee_photo_history h where h.employee_id = e.id
  );


-- ------------------------------------------------------------
-- 4. WHERE THINGS STAND
-- ------------------------------------------------------------
do $$
declare
  with_photo int;
  history_rows int;
  pending int;
begin
  select count(*) into with_photo  from public.employees where avatar_url is not null;
  select count(*) into history_rows from public.employee_photo_history;
  select count(*) into pending      from public.employees where avatar_removal_requested_at is not null;

  raise notice '------------------------------------------------------';
  raise notice 'employees with a photo    : %', with_photo;
  raise notice 'history rows              : %  (seeded from the above)', history_rows;
  raise notice 'removals awaiting an answer: %', pending;
  raise notice '';
  raise notice 'Replacing a photo still applies immediately. Removing one';
  raise notice 'now raises a request on the employee page instead of';
  raise notice 'clearing the picture clients can see.';
  raise notice '------------------------------------------------------';
end $$;
