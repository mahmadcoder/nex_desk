-- ============================================================
-- NEX DESK — SERVICE PRICING TIERS & FAQS MIGRATION
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
-- ============================================================

-- Add pricing_tiers, process_steps, and faqs JSONB columns to services table
alter table services 
  add column if not exists pricing_tiers jsonb default '[]'::jsonb,
  add column if not exists process_steps jsonb default '[]'::jsonb,
  add column if not exists faqs jsonb default '[]'::jsonb;

-- Comment for documentation
comment on column services.pricing_tiers is 'Array of 3 tier objects: { key, name, price, price_label, short_desc, features, is_popular, cta_text }';
comment on column services.faqs is 'Array of FAQ objects: { question, answer }';
comment on column services.process_steps is 'Array of 4 phase objects: { step_no, title, description }';
