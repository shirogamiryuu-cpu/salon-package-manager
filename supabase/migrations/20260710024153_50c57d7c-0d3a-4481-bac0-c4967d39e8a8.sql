
ALTER TABLE public.usage_logs
  ADD COLUMN IF NOT EXISTS variant_id uuid NULL REFERENCES public.package_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_label text NULL,
  ADD COLUMN IF NOT EXISTS price_applied numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS was_first_time boolean NOT NULL DEFAULT false;

ALTER TABLE public.session_deduction_requests
  ADD COLUMN IF NOT EXISTS variant_id uuid NULL REFERENCES public.package_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_label text NULL;
