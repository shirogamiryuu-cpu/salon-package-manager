
-- Customers read their own usage_logs
CREATE POLICY "customers read own usage_logs" ON public.usage_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customer_packages cp
    WHERE cp.id = usage_logs.customer_package_id AND cp.customer_id = auth.uid()
  ));

-- Customers read session_staff for their own usage_logs (to see staff names)
CREATE POLICY "customers read own session_staff" ON public.session_staff
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usage_logs ul
    JOIN public.customer_packages cp ON cp.id = ul.customer_package_id
    WHERE ul.id = session_staff.usage_log_id AND cp.customer_id = auth.uid()
  ));
