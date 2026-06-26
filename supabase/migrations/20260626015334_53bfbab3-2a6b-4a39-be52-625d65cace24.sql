ALTER TABLE public.customer_packages
  ADD COLUMN IF NOT EXISTS deposit_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz;