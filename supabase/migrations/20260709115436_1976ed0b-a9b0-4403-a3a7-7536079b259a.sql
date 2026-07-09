
CREATE TABLE public.package_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price NUMERIC NOT NULL,
  first_time_price NUMERIC,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX package_variants_package_id_idx ON public.package_variants(package_id);

GRANT SELECT ON public.package_variants TO anon, authenticated;
GRANT ALL ON public.package_variants TO service_role;

ALTER TABLE public.package_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view package variants"
  ON public.package_variants FOR SELECT
  USING (true);

CREATE POLICY "Admins manage package variants"
  ON public.package_variants FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_package_variants_updated_at
  BEFORE UPDATE ON public.package_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.customer_packages
  ADD COLUMN variant_id UUID REFERENCES public.package_variants(id) ON DELETE SET NULL,
  ADD COLUMN variant_label TEXT;
