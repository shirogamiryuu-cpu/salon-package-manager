-- Remove the first-time session pricing feature.
-- Pricing is now uniform per session; manual price overrides on
-- assignment / add-sessions / deduction cover one-off discounts.

ALTER TABLE public.packages DROP COLUMN IF EXISTS first_time_price;

ALTER TABLE public.package_variants DROP COLUMN IF EXISTS first_time_price;

ALTER TABLE public.usage_logs DROP COLUMN IF EXISTS was_first_time;
