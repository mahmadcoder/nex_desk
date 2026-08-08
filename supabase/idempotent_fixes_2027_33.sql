-- ============================================================
-- NEX DESK — Phase 52: NDA document type
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================
--
-- An NDA is signed and kept, so it belongs in `documents` alongside the
-- agreement — not rendered on demand like an offer letter. That means the
-- enum has to know about it.
--
-- `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block in older
-- Postgres, and cannot be rolled back. Guarded so re-running is a no-op.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'doc_type' and e.enumlabel = 'nda'
  ) then
    alter type doc_type add value 'nda';
  end if;
end $$;

comment on type doc_type is
  'quotation | agreement | invoice | receipt | change_order | progress_report | handover | nda';
