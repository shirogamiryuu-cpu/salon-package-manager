
-- 1) Add 'staff' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';

-- 2) Junction table linking usage_logs to staff users
CREATE TABLE IF NOT EXISTS public.session_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_log_id uuid NOT NULL REFERENCES public.usage_logs(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usage_log_id, staff_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_staff TO authenticated;
GRANT ALL ON public.session_staff TO service_role;

ALTER TABLE public.session_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage session_staff" ON public.session_staff
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "staff read own assignments" ON public.session_staff
  FOR SELECT TO authenticated
  USING (staff_user_id = auth.uid());

-- 3) Let staff read usage_logs rows they are assigned to
CREATE POLICY "staff read assigned usage" ON public.usage_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.session_staff ss
    WHERE ss.usage_log_id = usage_logs.id AND ss.staff_user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS session_staff_staff_idx ON public.session_staff(staff_user_id);
CREATE INDEX IF NOT EXISTS session_staff_log_idx ON public.session_staff(usage_log_id);
