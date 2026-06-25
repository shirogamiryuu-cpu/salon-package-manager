
ALTER TABLE public.customer_packages DROP CONSTRAINT IF EXISTS customer_packages_customer_id_fkey;
ALTER TABLE public.customer_packages
  ADD CONSTRAINT customer_packages_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.usage_logs DROP CONSTRAINT IF EXISTS usage_logs_admin_id_fkey;
ALTER TABLE public.usage_logs
  ADD CONSTRAINT usage_logs_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.session_staff DROP CONSTRAINT IF EXISTS session_staff_staff_user_id_fkey;
ALTER TABLE public.session_staff
  ADD CONSTRAINT session_staff_staff_user_id_fkey
    FOREIGN KEY (staff_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
