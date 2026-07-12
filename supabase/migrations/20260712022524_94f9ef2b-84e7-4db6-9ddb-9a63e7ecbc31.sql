
CREATE TABLE public.package_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.package_categories(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.package_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_categories TO authenticated;
GRANT ALL ON public.package_categories TO service_role;

ALTER TABLE public.package_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.package_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.package_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_package_categories_updated_at
  BEFORE UPDATE ON public.package_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.packages
  ADD COLUMN category_id uuid REFERENCES public.package_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_packages_category_id ON public.packages(category_id);
CREATE INDEX idx_package_categories_parent_id ON public.package_categories(parent_id);
