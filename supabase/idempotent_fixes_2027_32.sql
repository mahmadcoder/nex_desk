-- ============================================================
-- NEX DESK — Phase 51: support tickets
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================
--
-- The last module with nothing at all behind it. A client with a problem had
-- exactly two routes: email, or WhatsApp. Both lose the thread, neither has an
-- owner, and nobody can answer "how long did we take to fix that".

create table if not exists tickets (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  -- Optional: "the invoice is wrong" belongs to the relationship, not a project.
  project_id  uuid references projects(id) on delete set null,

  subject     text not null,
  body        text not null,
  priority    priority_level not null default 'normal',

  status      text not null default 'open'
                check (status in ('open','in_progress','waiting_client','resolved','closed')),

  assigned_employee_id uuid references employees(id) on delete set null,

  -- Who raised it. A client has no profiles row, so this is recorded by kind
  -- and name rather than being NULL and unattributable — the same shape the
  -- messages table uses.
  raised_by_kind text not null default 'client' check (raised_by_kind in ('client','staff')),
  raised_by_name text,

  -- SLA. Stamped once each and never rewritten: "when did somebody first
  -- reply" and "when was it fixed" are different questions from "what is the
  -- status now", and a status that moves backwards must not erase either.
  first_response_at timestamptz,
  resolved_at       timestamptz,
  closed_at         timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tickets_client_idx on tickets (client_id, created_at desc);
create index if not exists tickets_assignee_idx on tickets (assigned_employee_id, created_at desc);
-- The queue view: what is still on us, worst first.
create index if not exists tickets_open_idx
  on tickets (priority desc, created_at)
  where status in ('open','in_progress','waiting_client');

comment on column tickets.first_response_at is
  'Stamped on the first STAFF reply, once. Never rewritten — reopening a ticket must not erase how long the original reply took.';

alter table tickets enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tickets' and policyname = 'tickets_staff_all') then
    create policy tickets_staff_all on tickets for all using (is_staff());
  end if;
end $$;

-- ---------- TICKET REPLIES -----------------------------------

create table if not exists ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references tickets(id) on delete cascade,
  sender_kind text not null check (sender_kind in ('client','staff')),
  sender_id   uuid references profiles(id),
  sender_name text,
  body        text not null,
  -- An internal note is invisible to the client. Without it the whole
  -- conversation about a ticket happens somewhere else, which is the problem
  -- this table exists to solve.
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists ticket_messages_thread_idx on ticket_messages (ticket_id, created_at);

alter table ticket_messages enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'ticket_messages' and policyname = 'ticket_messages_staff_all') then
    create policy ticket_messages_staff_all on ticket_messages for all using (is_staff());
  end if;
end $$;
