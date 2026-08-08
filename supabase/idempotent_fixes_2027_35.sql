-- ============================================================
-- NEX DESK — Phase 54: attendance an admin can correct
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================

-- ---------- ADMIN OVERRIDES ON ATTENDANCE --------------------
--
-- `checkIn` / `checkOut` derive the employee from the session and take no id,
-- which is exactly right — nobody should be able to clock in as anybody else.
-- The consequence was that nothing could ever be corrected: a forgotten
-- check-out left a short day forever, and somebody who worked without pressing
-- the button read as absent for good.
--
-- These four columns are what a correction looks like. All nullable, so every
-- row that already exists stays precisely what it was.

alter table attendance add column if not exists edited_by   uuid references profiles(id);
alter table attendance add column if not exists edited_at   timestamptz;
alter table attendance add column if not exists edit_reason text;

-- Presence asserted WITHOUT clock times.
--
-- The alternative was for an admin to type an arrival of 09:00 and a departure
-- of 18:00 to mark somebody present — inventing two timestamps that never
-- happened, indistinguishable afterwards from ones that did. This says "present,
-- times unknown" honestly instead.
alter table attendance add column if not exists status_override text;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'attendance_status_override_check'
  ) then
    alter table attendance
      add constraint attendance_status_override_check
      check (status_override is null or status_override in ('present','absent'));
  end if;
end $$;

comment on column attendance.status_override is
  'Presence asserted by an admin for a day with no clock times. Consulted AFTER leave and holidays — an override must never paint over an approved leave request, because that is two systems disagreeing in writing.';

comment on column attendance.edit_reason is
  'Required by adminSetAttendance. An edited day has to be visibly different from a self check-in; the reason is what makes it so.';
