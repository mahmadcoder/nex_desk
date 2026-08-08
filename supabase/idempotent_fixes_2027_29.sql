-- ============================================================
-- NEX DESK — Phase 48: internal documents and real payslips
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================

-- ---------- PAYSLIP LINES ------------------------------------
--
-- `salary_payments.amount` was a single figure, so a month with a bonus or a
-- deduction was recorded as one number with the reason living in `note` — if
-- anywhere. Nobody could answer "why was March different".
--
-- `amount` keeps its meaning: BASE pay. Net is derived, never stored, so a
-- corrected bonus cannot leave a stale total behind it.

alter table salary_payments
  add column if not exists bonus       numeric(12,2) not null default 0,
  add column if not exists deductions  numeric(12,2) not null default 0,
  -- Why. A deduction with no reason on the payslip is how trust in payroll goes.
  add column if not exists bonus_note      text,
  add column if not exists deduction_note  text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'salary_payments_amounts_check') then
    alter table salary_payments
      add constraint salary_payments_amounts_check
      check (bonus >= 0 and deductions >= 0);
  end if;
end $$;

comment on column salary_payments.amount is
  'BASE pay for the period. Net = amount + bonus - deductions, derived at render time so a corrected line never leaves a stale total.';

-- ---------- INTERNAL DOCUMENTS -------------------------------
--
-- There has been nowhere for a staff-only file to live. `documents` is
-- client-scoped (client_id, deal_id, invoice_id) and `project_files` is
-- project-scoped, so the SOP, the brand guidelines and the shared reference
-- material had no home at all.

create table if not exists internal_docs (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  category     text not null default 'resource'
                 check (category in ('sop','brand','resource','policy','template')),
  storage_path text,
  -- Either a file OR a link. A brand guideline often lives in Figma, and
  -- forcing a re-upload guarantees the copy here goes stale.
  link_url     text,
  mime_type    text,
  file_size    int,
  uploaded_by  uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One or the other must be present, or the row points at nothing.
  constraint internal_docs_has_target check (storage_path is not null or link_url is not null)
);

create index if not exists internal_docs_category_idx
  on internal_docs (category, created_at desc);

comment on table internal_docs is
  'Staff-only reference material: SOPs, brand guidelines, policies, templates. Never visible to a client — this table has no client_id by design.';

alter table internal_docs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'internal_docs' and policyname = 'internal_docs_staff_read') then
    create policy internal_docs_staff_read on internal_docs for all using (is_staff());
  end if;
end $$;

-- ---------- STAFF DOCS BUCKET --------------------------------
--
-- Private. Downloads are signed through the service role, exactly like
-- `documents` and `project-files`.

insert into storage.buckets (id, name, public)
values ('staff-docs', 'staff-docs', false)
on conflict (id) do nothing;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and policyname = 'staff_docs_staff_all'
  ) then
    create policy staff_docs_staff_all on storage.objects
      for all using (bucket_id = 'staff-docs' and is_staff());
  end if;
end $$;
