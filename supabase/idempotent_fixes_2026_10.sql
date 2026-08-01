-- ============================================================
-- NEX DESK — PHASE 10: HANDOVER & THE BILLING LOOP (2026-10)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
--
-- Run AFTER supabase/idempotent_fixes_2026_09.sql
--
-- Adds:
--   1. change_requests — post-handover change work, quoted and charged
--   2. projects.handed_over_at / thanked_at — handover as a recorded event
--   3. Nothing else touches existing rows
-- ============================================================


-- ------------------------------------------------------------
-- 0. PRECONDITIONS
-- ------------------------------------------------------------

do $$
begin
  if to_regclass('public.projects') is null or to_regclass('public.invoices') is null then
    raise exception 'Run supabase/schema.sql first, then re-run this file.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'manual_progress'
  ) then
    raise exception 'Run supabase/idempotent_fixes_2026_09.sql first.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. HANDOVER AS AN EVENT
--
-- Handover used to be a PDF that opened in a new tab and changed nothing, so
-- there was no record it had happened and the button never stopped inviting
-- you to do it again.
-- ------------------------------------------------------------

alter table if exists public.projects
  add column if not exists handed_over_at timestamptz,
  add column if not exists thanked_at     timestamptz;

comment on column public.projects.handed_over_at is
  'When the handover pack was sent to the client. NULL means never handed over.';
comment on column public.projects.thanked_at is
  'When the admin sent the thank-you. Admin-triggered so it lands at the right moment.';


-- ------------------------------------------------------------
-- 2. CHANGE REQUESTS
--
-- What a client asks for after handover. Quoted, approved, invoiced and only
-- then built — and handover re-locks until that invoice is paid.
--
-- This is what the half-built `change_orders` code path was reaching for: the
-- ChangeOrderDoc PDF and change_order email template already existed, but the
-- table never did, so generating that document has always 500'd.
-- ------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'change_request_status') then
    create type change_request_status as enum
      ('requested','quoted','approved','invoiced','completed','declined');
  end if;
end $$;

create table if not exists public.change_requests (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  client_id      uuid not null references public.clients(id)  on delete cascade,
  title          text not null,
  description    text,
  quoted_amount  numeric(12,2),
  currency       text,
  extra_days     int,
  invoice_id     uuid references public.invoices(id) on delete set null,
  status         change_request_status not null default 'requested',
  -- 'client' when raised from the portal, 'admin' when logged internally.
  raised_by      text not null default 'admin',
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  quoted_at      timestamptz,
  approved_at    timestamptz,
  completed_at   timestamptz
);

create index if not exists idx_change_requests_project on public.change_requests(project_id);
create index if not exists idx_change_requests_client  on public.change_requests(client_id);
create index if not exists idx_change_requests_status  on public.change_requests(status);

alter table public.change_requests enable row level security;

drop policy if exists "staff manage change requests"  on public.change_requests;
drop policy if exists "clients read own change requests" on public.change_requests;

create policy "staff manage change requests" on public.change_requests
  for all using (is_staff()) with check (is_staff());

-- A client may see and raise requests on their own account only.
create policy "clients read own change requests" on public.change_requests
  for select using (
    client_id in (select id from public.clients where profile_id = auth.uid())
  );


-- ------------------------------------------------------------
-- 3. REPORT
-- ------------------------------------------------------------

do $$
declare handed int; pending_cr int;
begin
  select count(*) into handed     from public.projects where handed_over_at is not null;
  select count(*) into pending_cr from public.change_requests
    where status in ('requested','quoted','approved','invoiced');

  raise notice '------------------------------------------------------';
  raise notice 'projects already handed over: %', handed;
  raise notice 'open change requests: %', pending_cr;
  raise notice '';
  raise notice 'Projects delivered before this migration have handed_over_at';
  raise notice 'NULL, so their button will read "Hand over" again. Sending it';
  raise notice 're-issues the pack to the client, which is usually what you';
  raise notice 'want. To mark one as already done without emailing:';
  raise notice '  update public.projects set handed_over_at = delivered_at';
  raise notice '  where status = ''delivered'' and delivered_at is not null;';
  raise notice '------------------------------------------------------';
end $$;
