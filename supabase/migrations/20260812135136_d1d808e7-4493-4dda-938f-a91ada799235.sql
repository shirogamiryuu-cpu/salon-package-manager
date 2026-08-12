ALTER TABLE public.session_deduction_requests
ADD COLUMN IF NOT EXISTS approved_by_admin BOOLEAN NOT NULL DEFAULT false;