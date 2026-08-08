-- ============================================================
-- NEX DESK — Phase 53: onboarding intake + DPA document type
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================

-- ---------- INTAKE REQUESTS ----------------------------------
--
-- After a call you need details FROM the other side before you can set them
-- up. This holds the request and, once they fill it in, what they sent.
--
-- Critically, a submission NEVER writes to `clients` or `employees`. It lands
-- in `payload` and waits for an admin to approve it, at which point the normal
-- guarded action does the real write. An unauthenticated endpoint that could
-- create a client is the worst thing this feature could become.

create table if not exists intake_requests (
  id          uuid primary key default gen_random_uuid(),

  -- What goes in the URL. A v4 uuid is 122 bits of randomness, which is not
  -- guessable — but it is paired with an expiry and single use below, because
  -- an unguessable link that lives forever is still a link that leaks.
  token       uuid not null unique default gen_random_uuid(),

  kind        text not null check (kind in ('client','staff')),

  -- What they sent. Deliberately jsonb and not spread into columns: this is
  -- untrusted input from a public form, and it has no business resembling a
  -- clients row until a human has looked at it.
  payload     jsonb,

  status      text not null default 'pending'
                check (status in ('pending','submitted','approved','revoked')),

  -- A label so a list of pending requests is readable before anyone replies.
  label       text,
  note        text,

  expires_at  timestamptz not null default (now() + interval '14 days'),
  submitted_at timestamptz,

  created_by  uuid references profiles(id),
  -- The clients.id or employees.id created on approval. Its presence is what
  -- makes approving the same submission twice impossible.
  approved_id uuid,
  approved_at timestamptz,

  created_at  timestamptz not null default now()
);

create index if not exists intake_token_idx on intake_requests (token);
create index if not exists intake_open_idx
  on intake_requests (created_at desc)
  where status in ('pending','submitted');

comment on column intake_requests.payload is
  'Raw submission from a PUBLIC form. Never trusted, never written to clients/employees directly — an admin approves it and the normal guarded action performs the real write.';

comment on column intake_requests.approved_id is
  'The clients.id or employees.id created on approval. Its presence is the guard against approving one submission twice.';

alter table intake_requests enable row level security;

-- Staff read and manage. The PUBLIC form does not use this policy: it goes
-- through a server action on the service-role client, which looks the row up
-- by token and can therefore never enumerate the table.
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'intake_requests' and policyname = 'intake_staff_all') then
    create policy intake_staff_all on intake_requests for all using (is_staff());
  end if;
end $$;

-- ---------- DPA DOCUMENT TYPE --------------------------------
--
-- A Data Processing Agreement is signed and kept, like the NDA, so it belongs
-- in `documents`. Guarded the same way: ALTER TYPE ... ADD VALUE cannot run
-- inside a transaction block and cannot be rolled back.

do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'doc_type' and e.enumlabel = 'dpa'
  ) then
    alter type doc_type add value 'dpa';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'doc_type' and e.enumlabel = 'security'
  ) then
    alter type doc_type add value 'security';
  end if;
end $$;
