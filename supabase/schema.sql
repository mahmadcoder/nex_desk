-- ============================================================
-- NEX DESK — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------- ENUMS -------------------------------------------------

create type user_role       as enum ('owner','admin','staff','client');
create type lead_status     as enum ('new','contacted','quoted','won','lost');
create type deal_status     as enum ('draft','sent','locked','cancelled');
create type project_status  as enum ('not_started','in_progress','review','on_hold','delivered','completed','cancelled');
create type task_status     as enum ('backlog','todo','doing','review','done');
create type invoice_status  as enum ('draft','sent','partial','paid','overdue','void');
create type payment_method  as enum ('bank_transfer','jazzcash','easypaisa','wise','payoneer','stripe','paypal','cash','other');
create type doc_type        as enum ('quotation','agreement','invoice','receipt','change_order','progress_report','handover');
create type email_status    as enum ('queued','sent','failed','opened');
create type priority_level  as enum ('low','normal','high','urgent');

-- ---------- PROFILES (extends auth.users) -------------------------

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text unique not null,
  avatar_url  text,
  role        user_role not null default 'client',
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile whenever someone signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: is the current user staff (owner/admin/staff)?
create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('owner','admin','staff') and is_active
  );
$$;

-- ---------- SETTINGS (single row, agency config) ------------------

create table settings (
  id                 int primary key default 1 check (id = 1),
  company_name       text not null default 'Nex Desk',
  tagline            text default 'A software agency built on shipped work.',
  logo_url           text,
  email              text,
  phone              text,
  whatsapp           text,
  address            text,
  city               text,
  country            text default 'Pakistan',
  website            text,
  default_currency   text not null default 'PKR',
  tax_percent        numeric(5,2) not null default 0,
  invoice_prefix     text not null default 'ND',
  invoice_next_no    int not null default 1,
  bank_details       jsonb default '{}'::jsonb,
  email_signature    text,
  default_terms      text,
  socials            jsonb default '{}'::jsonb,
  updated_at         timestamptz not null default now()
);
insert into settings (id) values (1) on conflict do nothing;

-- ---------- SERVICES CATALOGUE ------------------------------------

create table services (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  category      text not null,
  short_desc    text,
  long_desc     text,
  icon          text,
  features      text[] default '{}',
  starting_at   numeric(12,2),
  currency      text default 'PKR',
  duration_note text,
  is_featured   boolean default false,
  is_active     boolean default true,
  sort_order    int default 0,
  seo_title     text,
  seo_desc      text,
  created_at    timestamptz not null default now()
);

create table packages (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid references services(id) on delete cascade,
  name         text not null,
  price        numeric(12,2) not null,
  currency     text default 'PKR',
  billing      text default 'one_time',
  features     text[] default '{}',
  delivery_days int,
  revisions    int,
  is_popular   boolean default false,
  sort_order   int default 0
);

-- ---------- LEADS (contact form inbox) ----------------------------

create table leads (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  phone         text,
  company       text,
  city          text,
  country       text,
  service_slugs text[] default '{}',
  budget_range  text,
  timeline      text,
  message       text,
  source        text default 'website',
  status        lead_status not null default 'new',
  priority      priority_level default 'normal',
  assigned_to   uuid references profiles(id),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- CLIENTS -----------------------------------------------

create table clients (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references profiles(id) on delete set null,
  name          text not null,
  email         text not null,
  phone         text,
  whatsapp      text,
  company       text,
  website       text,
  address       text,
  city          text,
  state         text,
  country       text,
  postal_code   text,
  timezone      text,
  tax_id        text,
  preferred_currency text default 'PKR',
  notes         text,
  tags          text[] default '{}',
  lead_id       uuid references leads(id),
  is_active     boolean default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on clients (email);

-- ---------- DEALS (the "lock the deal" record) --------------------

create table deals (
  id                uuid primary key default gen_random_uuid(),
  deal_no           text unique,
  client_id         uuid not null references clients(id) on delete cascade,
  title             text not null,
  summary           text,
  scope             text,
  deliverables      jsonb default '[]'::jsonb,   -- [{item, qty, price, note}]
  exclusions        text,
  subtotal          numeric(12,2) not null default 0,
  discount          numeric(12,2) not null default 0,
  tax_percent       numeric(5,2) not null default 0,
  total             numeric(12,2) not null default 0,
  currency          text not null default 'PKR',
  advance_percent   numeric(5,2) default 50,
  payment_schedule  jsonb default '[]'::jsonb,   -- [{label, percent, amount, due_on}]
  duration_days     int,
  start_date        date,
  deadline          date,
  revisions_included int default 2,
  terms             text,
  status            deal_status not null default 'draft',
  locked_at         timestamptz,
  locked_by         uuid references profiles(id),
  signature_name    text,
  signature_date    date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- PROJECTS ----------------------------------------------

create table projects (
  id            uuid primary key default gen_random_uuid(),
  deal_id       uuid references deals(id) on delete set null,
  client_id     uuid not null references clients(id) on delete cascade,
  name          text not null,
  description   text,
  status        project_status not null default 'not_started',
  progress      int not null default 0 check (progress between 0 and 100),
  start_date    date,
  deadline      date,
  delivered_at  timestamptz,
  staging_url   text,
  live_url      text,
  repo_url      text,
  lead_member   uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  description text,
  due_date    date,
  is_done     boolean default false,
  completed_at timestamptz,
  client_approved boolean default false,
  sort_order  int default 0
);

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  milestone_id uuid references milestones(id) on delete set null,
  title       text not null,
  description text,
  status      task_status not null default 'todo',
  priority    priority_level default 'normal',
  assigned_to uuid references profiles(id),
  due_date    date,
  sort_order  int default 0,
  created_at  timestamptz not null default now()
);

-- ---------- INVOICES & PAYMENTS -----------------------------------

create table invoices (
  id            uuid primary key default gen_random_uuid(),
  invoice_no    text unique not null,
  client_id     uuid not null references clients(id) on delete cascade,
  project_id    uuid references projects(id) on delete set null,
  deal_id       uuid references deals(id) on delete set null,
  line_items    jsonb default '[]'::jsonb,
  subtotal      numeric(12,2) not null default 0,
  discount      numeric(12,2) not null default 0,
  tax_percent   numeric(5,2) not null default 0,
  total         numeric(12,2) not null default 0,
  amount_paid   numeric(12,2) not null default 0,
  currency      text not null default 'PKR',
  issue_date    date not null default current_date,
  due_date      date,
  status        invoice_status not null default 'draft',
  notes         text,
  created_at    timestamptz not null default now()
);

create table payments (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid references invoices(id) on delete set null,
  client_id     uuid not null references clients(id) on delete cascade,
  amount        numeric(12,2) not null,
  currency      text not null default 'PKR',
  method        payment_method not null default 'bank_transfer',
  reference     text,
  paid_on       date not null default current_date,
  proof_url     text,
  note          text,
  recorded_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- Keep invoice.amount_paid and status in sync automatically
create or replace function sync_invoice_totals()
returns trigger language plpgsql security definer set search_path = public as $$
declare inv invoices; paid numeric;
begin
  if coalesce(new.invoice_id, old.invoice_id) is null then return coalesce(new, old); end if;
  select * into inv from invoices where id = coalesce(new.invoice_id, old.invoice_id);
  select coalesce(sum(amount),0) into paid from payments where invoice_id = inv.id;
  update invoices set
    amount_paid = paid,
    status = case
      when paid >= inv.total and inv.total > 0 then 'paid'::invoice_status
      when paid > 0 then 'partial'::invoice_status
      when inv.due_date is not null and inv.due_date < current_date then 'overdue'::invoice_status
      else inv.status end
  where id = inv.id;
  return coalesce(new, old);
end; $$;

create trigger payments_sync_invoice
  after insert or update or delete on payments
  for each row execute function sync_invoice_totals();

-- ---------- DOCUMENTS (generated PDFs) ----------------------------

create table documents (
  id          uuid primary key default gen_random_uuid(),
  type        doc_type not null,
  title       text not null,
  client_id   uuid references clients(id) on delete cascade,
  deal_id     uuid references deals(id) on delete set null,
  project_id  uuid references projects(id) on delete set null,
  invoice_id  uuid references invoices(id) on delete set null,
  storage_path text not null,
  file_size   int,
  snapshot    jsonb,       -- frozen data the PDF was rendered from
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- ---------- EMAIL TEMPLATES & LOG ---------------------------------

create table email_templates (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  name        text not null,
  subject     text not null,
  body        text not null,        -- supports {{variables}}
  attach_doc  doc_type,
  description text,
  is_active   boolean default true
);

create table email_log (
  id           uuid primary key default gen_random_uuid(),
  template_key text,
  to_email     text not null,
  cc           text[],
  subject      text not null,
  body_preview text,
  client_id    uuid references clients(id) on delete set null,
  project_id   uuid references projects(id) on delete set null,
  document_id  uuid references documents(id) on delete set null,
  status       email_status not null default 'queued',
  provider_id  text,
  error        text,
  sent_by      uuid references profiles(id),
  sent_at      timestamptz not null default now(),
  opened_at    timestamptz
);

-- ---------- CMS: case studies, testimonials, blog, faq ------------

create table case_studies (
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
  live_url     text,
  is_featured  boolean default false,
  is_published boolean default false,
  sort_order   int default 0,
  created_at   timestamptz not null default now()
);

create table testimonials (
  id          uuid primary key default gen_random_uuid(),
  client_name text not null,
  role        text,
  company     text,
  avatar_url  text,
  quote       text not null,
  rating      int check (rating between 1 and 5),
  project_id  uuid references projects(id) on delete set null,
  is_published boolean default false,
  sort_order  int default 0
);

create table posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  excerpt      text,
  content      text,
  cover_url    text,
  tags         text[] default '{}',
  author_id    uuid references profiles(id),
  read_minutes int,
  seo_title    text,
  seo_desc     text,
  is_published boolean default false,
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

create table faqs (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answer     text not null,
  category   text default 'general',
  sort_order int default 0,
  is_active  boolean default true
);

-- ---------- CLIENT PORTAL: files & messages -----------------------

create table project_files (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  name         text not null,
  storage_path text not null,
  mime_type    text,
  file_size    int,
  uploaded_by  uuid references profiles(id),
  visible_to_client boolean default true,
  created_at   timestamptz not null default now()
);

create table messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  sender_id   uuid references profiles(id),
  body        text not null,
  attachments jsonb default '[]'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------- AUDIT LOG ---------------------------------------------

create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references profiles(id),
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  meta       jsonb default '{}'::jsonb,
  ip         text,
  created_at timestamptz not null default now()
);

-- ---------- AUTO NUMBERING ----------------------------------------

create or replace function next_invoice_no()
returns text language plpgsql security definer set search_path = public as $$
declare pfx text; n int;
begin
  update settings set invoice_next_no = invoice_next_no + 1
  where id = 1 returning invoice_prefix, invoice_next_no - 1 into pfx, n;
  return pfx || '-' || to_char(now(),'YYYY') || '-' || lpad(n::text, 4, '0');
end; $$;

create or replace function set_deal_no()
returns trigger language plpgsql as $$
begin
  if new.deal_no is null then
    new.deal_no := 'ND-D-' || to_char(now(),'YYYY') || '-' ||
                   lpad((select count(*)+1 from deals)::text, 4, '0');
  end if;
  return new;
end; $$;

create trigger deals_set_no before insert on deals
  for each row execute function set_deal_no();

-- updated_at touch
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

do $$
declare t text;
begin
  foreach t in array array['leads','clients','deals','projects'] loop
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- Staff see everything. Clients see only their own rows.
-- Public site reads only published marketing content.
-- ============================================================

alter table profiles       enable row level security;
alter table settings       enable row level security;
alter table services       enable row level security;
alter table packages       enable row level security;
alter table leads          enable row level security;
alter table clients        enable row level security;
alter table deals          enable row level security;
alter table projects       enable row level security;
alter table milestones     enable row level security;
alter table tasks          enable row level security;
alter table invoices       enable row level security;
alter table payments       enable row level security;
alter table documents      enable row level security;
alter table email_templates enable row level security;
alter table email_log      enable row level security;
alter table case_studies   enable row level security;
alter table testimonials   enable row level security;
alter table posts          enable row level security;
alter table faqs           enable row level security;
alter table project_files  enable row level security;
alter table messages       enable row level security;
alter table audit_log      enable row level security;

-- Profiles
create policy "read own profile"  on profiles for select using (id = auth.uid() or is_staff());
create policy "update own profile" on profiles for update using (id = auth.uid() or is_staff());
create policy "staff manage profiles" on profiles for all using (is_staff());

-- Staff-only tables (full access, no public read)
do $$
declare t text;
begin
  foreach t in array array['leads','deals','invoices','payments','email_templates','email_log','audit_log','tasks'] loop
    execute format('create policy "staff all" on %I for all using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

-- Public marketing content: anyone reads published, staff manages
create policy "public read services"   on services     for select using (is_active or is_staff());
create policy "staff write services"   on services     for all using (is_staff()) with check (is_staff());
create policy "public read packages"   on packages     for select using (true);
create policy "staff write packages"   on packages     for all using (is_staff()) with check (is_staff());
create policy "public read cases"      on case_studies for select using (is_published or is_staff());
create policy "staff write cases"      on case_studies for all using (is_staff()) with check (is_staff());
create policy "public read testimonials" on testimonials for select using (is_published or is_staff());
create policy "staff write testimonials" on testimonials for all using (is_staff()) with check (is_staff());
create policy "public read posts"      on posts        for select using (is_published or is_staff());
create policy "staff write posts"      on posts        for all using (is_staff()) with check (is_staff());
create policy "public read faqs"       on faqs         for select using (is_active or is_staff());
create policy "staff write faqs"       on faqs         for all using (is_staff()) with check (is_staff());
create policy "public read settings"   on settings     for select using (true);
create policy "staff write settings"   on settings     for all using (is_staff()) with check (is_staff());

-- Clients: staff full, client reads own record
create policy "clients staff all" on clients for all using (is_staff()) with check (is_staff());
create policy "clients read own"  on clients for select using (profile_id = auth.uid());

-- Projects & children: staff full, client reads own
create policy "projects staff all" on projects for all using (is_staff()) with check (is_staff());
create policy "projects read own"  on projects for select using (
  client_id in (select id from clients where profile_id = auth.uid()));

create policy "milestones staff all" on milestones for all using (is_staff()) with check (is_staff());
create policy "milestones read own"  on milestones for select using (
  project_id in (select p.id from projects p join clients c on c.id = p.client_id where c.profile_id = auth.uid()));

create policy "documents staff all" on documents for all using (is_staff()) with check (is_staff());
create policy "documents read own"  on documents for select using (
  client_id in (select id from clients where profile_id = auth.uid()));

create policy "files staff all" on project_files for all using (is_staff()) with check (is_staff());
create policy "files read own"  on project_files for select using (
  visible_to_client and project_id in (
    select p.id from projects p join clients c on c.id = p.client_id where c.profile_id = auth.uid()));

create policy "messages staff all" on messages for all using (is_staff()) with check (is_staff());
create policy "messages own"       on messages for select using (
  project_id in (select p.id from projects p join clients c on c.id = p.client_id where c.profile_id = auth.uid()));
create policy "messages client send" on messages for insert with check (sender_id = auth.uid());

-- ---------- STORAGE BUCKETS ---------------------------------------
insert into storage.buckets (id, name, public) values
  ('documents','documents', false),
  ('project-files','project-files', false),
  ('public-assets','public-assets', true)
on conflict do nothing;

create policy "staff manage documents" on storage.objects for all
  using (bucket_id = 'documents' and is_staff());
create policy "staff manage project files" on storage.objects for all
  using (bucket_id = 'project-files' and is_staff());
create policy "anyone read public assets" on storage.objects for select
  using (bucket_id = 'public-assets');
create policy "staff write public assets" on storage.objects for all
  using (bucket_id = 'public-assets' and is_staff());
