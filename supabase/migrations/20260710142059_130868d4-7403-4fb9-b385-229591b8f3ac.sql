
CREATE TABLE public.salon_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  phone text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.salon_contacts TO anon, authenticated;
GRANT ALL ON public.salon_contacts TO service_role;

ALTER TABLE public.salon_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active salon contacts"
  ON public.salon_contacts FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage salon contacts"
  ON public.salon_contacts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_salon_contacts_updated_at
  BEFORE UPDATE ON public.salon_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
