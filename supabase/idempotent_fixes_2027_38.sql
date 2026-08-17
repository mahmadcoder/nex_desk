-- ============================================================
-- NEX DESK — CONSOLIDATED IDEMPOTENT SQL CHECKS (2027-38)
-- Safe to run in Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1. Client lifecycle enum & columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_lifecycle') THEN
    CREATE TYPE client_lifecycle AS ENUM ('active', 'dormant', 'archived');
  END IF;
END $$;

ALTER TABLE IF EXISTS public.clients
  ADD COLUMN IF NOT EXISTS lifecycle client_lifecycle NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dormant_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_clients_lifecycle ON public.clients(lifecycle);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients(is_active);

-- 2. Profiles table active flag
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 3. Employees table status
ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';

CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);

-- 4. Meetings multi-staff and notes
ALTER TABLE IF EXISTS public.meetings
  ADD COLUMN IF NOT EXISTS staff_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. Project files staff visibility
ALTER TABLE IF EXISTS public.project_files
  ADD COLUMN IF NOT EXISTS visible_to_staff BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS uploaded_by TEXT DEFAULT 'admin';

-- 6. Intake requests tracking & resolution
ALTER TABLE IF EXISTS public.intake_requests
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID;

-- 7. Offboarding email templates
INSERT INTO email_templates (key, name, subject, body, attach_doc, description) VALUES
('client_archived', 'Client archived / offboarding', 'Account Update — {{client_company}} (Nex Desk)',
E'Hi {{client_name}},\n\nThis is to confirm that your client portal access for {{client_company}} has been archived as our active project engagement concludes.\n\nIf you require copies of any past agreements, receipts, or project assets, or if you would like to initiate a new project in the future, please feel free to reply directly to this email.\n\nThank you for partnering with Nex Desk.\n\nNex Desk', null, 'Sent when a client profile is soft-deleted/archived with the offboarding email toggle checked.'),

('employee_deactivated', 'Staff deactivation / offboarding', 'Staff Account Deactivation — {{employee_name}} (Nex Desk)',
E'Hi {{employee_name}},\n\nThis email confirms that your Nex Desk team account and system access have been deactivated.\n\nThank you for your dedication and contributions to the agency. For any questions regarding your final settlement, experience documentation, or handover procedures, please reach out to agency administration.\n\nWe wish you the very best in your future endeavors.\n\nNex Desk Administration', null, 'Sent when a team member profile is removed/terminated with the offboarding email toggle checked.')
ON CONFLICT (key) DO UPDATE SET
  name        = excluded.name,
  subject     = excluded.subject,
  body        = excluded.body,
  attach_doc  = excluded.attach_doc,
  description = excluded.description;
