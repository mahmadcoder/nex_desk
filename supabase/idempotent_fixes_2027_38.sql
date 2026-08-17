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

-- 7. Offboarding & Reactivation email templates
INSERT INTO email_templates (key, name, subject, body, attach_doc, description) VALUES
('client_archived', 'Client archived / offboarding', 'Account Update — {{client_company}} (Nex Desk)',
E'Hi {{client_name}},\n\nThis is to confirm that your client portal access for {{client_company}} has been archived as our active project engagement concludes.\n\nIf you require copies of any past agreements, receipts, or project assets, or if you would like to initiate a new project in the future, please feel free to reply directly to this email.\n\nThank you for partnering with Nex Desk.\n\nNex Desk', null, 'Sent when a client profile is soft-deleted/archived with the offboarding email toggle checked.'),

('employee_deactivated', 'Staff deactivation / offboarding', 'Staff Account Deactivation — {{employee_name}} (Nex Desk)',
E'Hi {{employee_name}},\n\nThis email confirms that your Nex Desk team account and system access have been deactivated.\n\nThank you for your dedication and contributions to the agency. For any questions regarding your final settlement, experience documentation, or handover procedures, please reach out to agency administration.\n\nWe wish you the very best in your future endeavors.\n\nNex Desk Administration', null, 'Sent when a team member profile is removed/terminated with the offboarding email toggle checked.'),

('client_welcome_back', 'Client reactivated / welcome back', '👋 Welcome back, {{client_name}} — your portal is active',
E'Hi {{client_name}},\n\nGood to have you back!\n\nYour client portal for {{client_company}} has been reactivated. All of your past documents, invoices, milestones, and project records are right where you left them:\n\n• Sign In: {{portal_url}}\n• Email: {{client_email}}\n\nYour existing sign-in credentials remain active. If you need any assistance or would like to initiate a new project, we are ready whenever you are.\n\nBest regards,\n{{sender_name}}\nNex Desk', null, 'Sent when an archived client is reactivated/restored.'),

('employee_reactivated', 'Staff reactivated / welcome back', '🎉 Welcome Back to Nex Desk, {{employee_name}} — Account Reactivated',
E'Hi {{employee_name}},\n\nWe are delighted to welcome you back to the Nex Desk team!\n\nYour staff account and system access have been reactivated. You can sign in using your existing credentials:\n\n• Sign In: {{staff_login_url}}\n• Email: {{staff_email}}\n\nYour assigned clients, active projects, and workspace are ready for you. If you need a password reset or have any questions getting back up to speed, please reach out to administration.\n\nGlad to have you back with us!\n\nNex Desk Administration', null, 'Sent when an inactive/terminated staff member is restored to active status.')
ON CONFLICT (key) DO UPDATE SET
  name        = excluded.name,
  subject     = excluded.subject,
  body        = excluded.body,
  attach_doc  = excluded.attach_doc,
  description = excluded.description;

-- 8. Milestones revision feedback columns
ALTER TABLE IF EXISTS public.milestones
  ADD COLUMN IF NOT EXISTS revision_notes TEXT,
  ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revision_requested_by TEXT;
