-- ============================================================
-- NEX DESK — CMS TABLES (CASE STUDIES, TESTIMONIALS, FAQS, SERVICES)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
-- ============================================================

-- 1. CASE STUDIES TABLE (Work Showcase / "Something Ships Here Every Week")
create table if not exists case_studies (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  client_name  text,
  industry     text,
  cover_url    text,
  gallery      text[] default '{}',
  challenge    text,
  solution     text,
  outcome      text,
  metrics      jsonb default '[]'::jsonb,  -- [{label, value}]
  tech_stack   text[] default '{}',
  services     text[] default '{}',
  live_url     text,
  is_featured  boolean default true,
  is_published boolean default true,
  sort_order   int default 0,
  created_at   timestamptz not null default now()
);

alter table case_studies add column if not exists is_published boolean default true;
alter table case_studies add column if not exists is_featured boolean default true;
alter table case_studies add column if not exists services text[] default '{}';

alter table case_studies enable row level security;
drop policy if exists "Public read case_studies" on case_studies;
create policy "Public read case_studies" on case_studies for select using (true);


-- 2. TESTIMONIALS TABLE (Client Reviews / Testimonial Wall)
create table if not exists testimonials (
  id           uuid primary key default gen_random_uuid(),
  client_name  text not null,
  role         text,
  company      text,
  avatar_url   text,
  quote        text not null,
  rating       int default 5 check (rating between 1 and 5),
  project_id   uuid references projects(id) on delete set null,
  is_published boolean default true,
  sort_order   int default 0,
  created_at   timestamptz not null default now()
);

alter table testimonials add column if not exists is_published boolean default true;

alter table testimonials enable row level security;
drop policy if exists "Public read testimonials" on testimonials;
create policy "Public read testimonials" on testimonials for select using (true);


-- 3. FAQS TABLE (Frequently Asked Questions)
create table if not exists faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,
  category    text default 'General',
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz not null default now()
);

alter table faqs add column if not exists is_active boolean default true;

alter table faqs enable row level security;
drop policy if exists "Public read faqs" on faqs;
create policy "Public read faqs" on faqs for select using (true);


-- 4. SERVICES TABLE (Agency Capabilities & 3-Tier Pricing)
create table if not exists services (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  category      text not null,
  short_desc    text,
  long_desc     text,
  features      text[] default '{}',
  starting_at   numeric(12,2),
  currency      text default 'USD',
  duration_note text,
  scope_note    text,
  pricing_tiers jsonb default '[]'::jsonb,
  process_steps jsonb default '[]'::jsonb,
  faqs          jsonb default '[]'::jsonb,
  is_featured   boolean default true,
  is_active     boolean default true,
  sort_order    int default 0,
  created_at    timestamptz not null default now()
);

alter table services add column if not exists pricing_tiers jsonb default '[]'::jsonb;
alter table services add column if not exists process_steps jsonb default '[]'::jsonb;
alter table services add column if not exists faqs jsonb default '[]'::jsonb;
alter table services add column if not exists is_active boolean default true;

alter table services enable row level security;
drop policy if exists "Public read services" on services;
create policy "Public read services" on services for select using (true);
