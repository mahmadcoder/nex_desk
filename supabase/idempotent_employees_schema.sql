-- ============================================================
-- NEX DESK — EMPLOYEE MANAGEMENT & MULTI-CLIENT ASSIGNMENT MIGRATION
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run multiple times (idempotent)
-- ============================================================

-- 1. DYNAMIC JOB TITLES TABLE
create table if not exists employee_job_titles (
  id          uuid primary key default gen_random_uuid(),
  title       text not null unique,
  category    text default 'General',
  created_at  timestamptz not null default now()
);

-- Seed default agency job titles if empty
insert into employee_job_titles (title, category) values
  ('Senior Full-Stack Developer', 'Engineering'),
  ('React Native Engineer', 'Engineering'),
  ('UI/UX Product Designer', 'Design'),
  ('Brand Identity Specialist', 'Design'),
  ('Technical SEO Lead', 'Marketing'),
  ('Social Media Growth Manager', 'Marketing'),
  ('AI Automation Engineer', 'AI & Automation'),
  ('Client Success Manager', 'Operations')
on conflict (title) do nothing;


-- 2. EMPLOYEES TABLE
create table if not exists employees (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  full_name       text not null,
  email           text not null unique,
  phone           text,
  avatar_url      text,
  job_title       text not null,
  seniority       text default 'Senior', -- Junior, Mid, Senior, Lead, Executive
  city            text,
  country         text,
  education       text,
  salary_amount   numeric default 0,
  salary_currency text default 'USD',
  employment_type text default 'Full-Time', -- Full-Time, Part-Time, Contractor, Intern
  joining_date    date default current_date,
  status          text default 'Active', -- Active, On Leave, Terminated
  skills          text[] default '{}',
  notes           text,
  created_at      timestamptz not null default now()
);


-- 3. CLIENT & EMPLOYEE ASSIGNMENTS (MANY-TO-MANY)
create table if not exists client_employee_assignments (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references profiles(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  project_id  uuid references projects(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique(client_id, employee_id, project_id)
);


-- 4. ROW LEVEL SECURITY (RLS) POLICIES
alter table employee_job_titles enable row level security;
alter table employees enable row level security;
alter table client_employee_assignments enable row level security;

-- Drop existing policies if any
drop policy if exists "staff manage job titles" on employee_job_titles;
drop policy if exists "staff manage employees" on employees;
drop policy if exists "staff manage client assignments" on client_employee_assignments;
drop policy if exists "clients read assigned employees" on employees;

-- Staff full access policies
create policy "staff manage job titles" on employee_job_titles for all using (is_staff()) with check (is_staff());
create policy "staff manage employees" on employees for all using (is_staff()) with check (is_staff());
create policy "staff manage client assignments" on client_employee_assignments for all using (is_staff()) with check (is_staff());

-- Client Portal access: clients can read assigned employees
create policy "clients read assigned employees" on employees for select using (
  id in (
    select employee_id from client_employee_assignments where client_id = auth.uid()
  )
);
