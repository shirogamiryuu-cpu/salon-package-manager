
-- Promotions module
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value >= 0),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view promotions"
  ON public.promotions FOR SELECT
  USING (true);

CREATE POLICY "Admins manage promotions"
  ON public.promotions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.package_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promotion_id, package_id)
);

GRANT SELECT ON public.package_promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.package_promotions TO authenticated;
GRANT ALL ON public.package_promotions TO service_role;

ALTER TABLE public.package_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view package_promotions"
  ON public.package_promotions FOR SELECT
  USING (true);

CREATE POLICY "Admins manage package_promotions"
  ON public.package_promotions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_package_promotions_package ON public.package_promotions(package_id);
CREATE INDEX idx_package_promotions_promotion ON public.package_promotions(promotion_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation: prevent assigning a package to two active/overlapping promotions
CREATE OR REPLACE FUNCTION public.validate_package_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_prom RECORD;
  conflict_count INT;
BEGIN
  SELECT * INTO new_prom FROM public.promotions WHERE id = NEW.promotion_id;
  IF new_prom.is_active = false THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) INTO conflict_count
  FROM public.package_promotions pp
  JOIN public.promotions p ON p.id = pp.promotion_id
  WHERE pp.package_id = NEW.package_id
    AND pp.promotion_id <> NEW.promotion_id
    AND p.is_active = true
    AND p.start_date <= new_prom.end_date
    AND p.end_date >= new_prom.start_date;
  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Package is already assigned to another active promotion in the same date range';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_package_promotion_trigger
BEFORE INSERT OR UPDATE ON public.package_promotions
FOR EACH ROW EXECUTE FUNCTION public.validate_package_promotion();
