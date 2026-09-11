-- ============================================================
-- Migration 2027-35: Client Avatars & Password Change Tracking
-- ============================================================
-- 1. avatar_url on clients: Allows agency admins to upload and assign
--    profile photos for clients, displayed in the Client Portal and Admin CRM.
-- 2. password_changed_at on clients: Records the exact timestamp when a client
--    updates their portal password, alerting admins in CRM.

alter table public.clients add column if not exists avatar_url text;
alter table public.clients add column if not exists password_changed_at timestamptz;

comment on column public.clients.avatar_url is
  'Admin-managed client profile photo URL in public-assets bucket, rendered in client portal and admin CRM.';

comment on column public.clients.password_changed_at is
  'Timestamp when client last updated their password from the portal, used to notify admins and display badge in CRM.';
