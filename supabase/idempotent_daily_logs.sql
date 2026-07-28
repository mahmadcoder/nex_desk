-- =========================================================
-- IDEMPOTENT SQL MIGRATION: Daily Work Logs & Signed Client Documents
-- =========================================================

-- 1. Ensure documents table supports client uploaded signed agreements
ALTER TABLE IF EXISTS public.documents
  ADD COLUMN IF NOT EXISTS uploaded_by_client BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'general';

-- 2. Create daily_work_logs table for employee reporting
CREATE TABLE IF NOT EXISTS public.daily_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  project_title TEXT,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours_spent NUMERIC(4, 2) DEFAULT 0,
  tasks_completed TEXT NOT NULL,
  blockers TEXT,
  proof_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Index for performant querying by date and employee
CREATE INDEX IF NOT EXISTS idx_daily_work_logs_date ON public.daily_work_logs(work_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_work_logs_employee ON public.daily_work_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_daily_work_logs_project ON public.daily_work_logs(project_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.daily_work_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Public and staff read daily work logs" ON public.daily_work_logs;
CREATE POLICY "Public and staff read daily work logs" ON public.daily_work_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public and staff write daily work logs" ON public.daily_work_logs;
CREATE POLICY "Public and staff write daily work logs" ON public.daily_work_logs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public and staff update daily work logs" ON public.daily_work_logs;
CREATE POLICY "Public and staff update daily work logs" ON public.daily_work_logs
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public and staff delete daily work logs" ON public.daily_work_logs;
CREATE POLICY "Public and staff delete daily work logs" ON public.daily_work_logs
  FOR DELETE USING (true);
