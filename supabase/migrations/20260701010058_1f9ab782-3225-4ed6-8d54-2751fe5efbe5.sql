
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'stylist';

ALTER TABLE public.customer_packages
  ADD COLUMN IF NOT EXISTS deposit_sessions_paid integer NOT NULL DEFAULT 0;

UPDATE public.customer_packages
SET deposit_sessions_paid = CASE
  WHEN deposit_paid THEN GREATEST(1, CEIL(total_sessions::numeric / 2))::int
  ELSE 0
END
WHERE deposit_sessions_paid = 0;

ALTER TABLE public.customer_packages
  DROP CONSTRAINT IF EXISTS deposit_sessions_paid_range;
ALTER TABLE public.customer_packages
  ADD CONSTRAINT deposit_sessions_paid_range
  CHECK (deposit_sessions_paid >= 0 AND deposit_sessions_paid <= total_sessions);
