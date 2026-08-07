-- ============================================================
-- NEX DESK — Phase 42: surviving a Gmail 451
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================
--
-- `451-4.3.0 Mail server temporarily rejected message` showed up in the Email
-- Centre. 451 is a 4.x.x code — Gmail saying "try again later" — but nothing
-- retried it, so a client email was lost and the only trace was a red row.
--
-- sendEmail now retries transient failures and paces its sends. These two
-- columns cover the part retrying cannot: seeing how hard a message had to
-- work, and re-sending one that never made it.

alter table email_log
  -- Everything sendEmail was called with, so a failed message can be replayed
  -- exactly. body_preview is truncated to 300 characters, so it is NOT enough
  -- to rebuild a real send from — a resend based on it would either send a
  -- mangled message or leak raw {{placeholders}} to a client.
  --
  -- Holds the same content that already went out by email, and email_log is
  -- only ever read through the service-role client on admin pages.
  add column if not exists send_args jsonb,

  -- 1 on a clean send. Higher means Gmail pushed back and the retry loop won,
  -- which is worth seeing before it turns into a failure.
  add column if not exists attempts int not null default 1;

comment on column email_log.send_args is
  'Serialisable SendArgs for replay from the Email Centre. rawAttachments are Buffers and are recorded as hadRawAttachments:true instead — resend is disabled for those rows rather than sending a mail with the attachment silently missing.';

comment on column email_log.attempts is
  'How many sendMail tries this row took. >1 means transient SMTP pushback (see isTransient in src/lib/email/send.ts).';

-- Failed rows are the ones the Email Centre offers a Resend on, and they are a
-- small minority of the table.
create index if not exists email_log_failed_idx
  on email_log (sent_at desc)
  where status = 'failed';
