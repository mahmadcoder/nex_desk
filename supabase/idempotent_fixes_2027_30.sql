-- ============================================================
-- NEX DESK — Phase 49: departments, holidays, recruitment
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent)
-- ============================================================

-- ---------- DEPARTMENTS --------------------------------------
--
-- Distinct from `employee_job_titles.category`, which groups TITLES ("Senior
-- Full-Stack Developer" → Engineering). A department is the org unit a PERSON
-- belongs to, and the two genuinely differ: a designer can sit in Marketing.
--
-- Roles stay owner / admin / staff. Departments are for grouping and reporting,
-- never for access — every guard in the app reads the role, and rewiring them
-- to read this instead is where data quietly gets exposed.

create table if not exists departments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  -- Who runs it. Nullable: a department can exist before it has a head.
  lead_id    uuid references employees(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table employees
  add column if not exists department_id uuid references departments(id) on delete set null;

create index if not exists employees_department_idx on employees (department_id);

comment on column employees.department_id is
  'Org unit. Grouping and reporting only — access is decided by profiles.role, never by this.';

alter table departments enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'departments' and policyname = 'departments_staff_all') then
    create policy departments_staff_all on departments for all using (is_staff());
  end if;
end $$;

-- Seeded from the job-title categories already in use, so the feature is not
-- an empty list on the first load. Only runs when the table is empty.
insert into departments (name, sort_order)
select distinct category, row_number() over (order by category)
from employee_job_titles
where category is not null and category <> ''
  and not exists (select 1 from departments)
on conflict (name) do nothing;

-- ---------- HOLIDAYS -----------------------------------------
--
-- Attendance has been calling a public holiday "absent", because nothing told
-- it otherwise. `judgeAttendance` now consults this before it renders a
-- verdict — the same precedence that already protects approved leave.

create table if not exists holidays (
  id         uuid primary key default gen_random_uuid(),
  -- The actual date. Recurring holidays are entered per year rather than as a
  -- rule: Eid moves against the Gregorian calendar every year, so a
  -- month-and-day rule would be wrong here more often than right.
  holiday_on date not null unique,
  name       text not null,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists holidays_date_idx on holidays (holiday_on);

comment on table holidays is
  'Agency-wide non-working days. Checked by judgeAttendance before absence or lateness is decided.';

alter table holidays enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'holidays' and policyname = 'holidays_staff_all') then
    create policy holidays_staff_all on holidays for all using (is_staff());
  end if;
end $$;

-- ---------- RECRUITMENT --------------------------------------

create table if not exists applicants (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  email        text not null,
  phone        text,
  role_applied text not null,
  department_id uuid references departments(id) on delete set null,

  stage        text not null default 'applied'
                 check (stage in ('applied','screening','interview','offer','hired','rejected')),
  source       text,
  cv_url       text,
  portfolio_url text,
  expected_salary numeric(12,2),
  currency     text default 'USD',
  notes        text,

  -- Set when the stage becomes 'hired' and the person is created as an
  -- employee. Stops the same applicant being hired twice.
  employee_id  uuid references employees(id) on delete set null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists applicants_stage_idx on applicants (stage, created_at desc);

comment on column applicants.employee_id is
  'Set once hired. Its presence is what makes a second hire from the same application impossible.';

alter table applicants enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'applicants' and policyname = 'applicants_staff_all') then
    create policy applicants_staff_all on applicants for all using (is_staff());
  end if;
end $$;
