DROP POLICY IF EXISTS "Admins manage categories" ON public.package_categories;
CREATE POLICY "Admins manage categories" ON public.package_categories
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;