
ALTER TABLE public.customer_packages
  ADD COLUMN IF NOT EXISTS warranty_years integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warranty_expires_at timestamptz;
