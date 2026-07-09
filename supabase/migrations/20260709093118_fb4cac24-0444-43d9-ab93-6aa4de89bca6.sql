
ALTER TABLE public.customer_packages
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Backfill total_price from packages.price scaled to purchased sessions.
UPDATE public.customer_packages cp
SET total_price = ROUND(
  (COALESCE(p.price, 0) / NULLIF(p.total_sessions, 0)) * cp.total_sessions
, 2)
FROM public.packages p
WHERE p.id = cp.package_id
  AND cp.total_price = 0;

-- Backfill deposit_amount from deposit_sessions_paid at package unit price.
UPDATE public.customer_packages cp
SET deposit_amount = ROUND(
  (COALESCE(p.price, 0) / NULLIF(p.total_sessions, 0)) * COALESCE(cp.deposit_sessions_paid, 0)
, 2)
FROM public.packages p
WHERE p.id = cp.package_id
  AND cp.deposit_amount = 0;
