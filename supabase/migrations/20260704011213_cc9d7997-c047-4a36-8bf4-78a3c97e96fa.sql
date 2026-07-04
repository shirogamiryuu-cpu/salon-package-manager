
CREATE TABLE public.session_deduction_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id uuid NOT NULL REFERENCES public.customer_packages(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  staff_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  usage_log_id uuid REFERENCES public.usage_logs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  responded_at timestamptz,
  CONSTRAINT session_deduction_requests_status_check CHECK (status IN ('pending','approved','rejected','expired','cancelled'))
);

CREATE INDEX idx_sdr_customer_pending ON public.session_deduction_requests(customer_id, status);
CREATE INDEX idx_sdr_cp ON public.session_deduction_requests(customer_package_id);

GRANT SELECT, INSERT, UPDATE ON public.session_deduction_requests TO authenticated;
GRANT ALL ON public.session_deduction_requests TO service_role;

ALTER TABLE public.session_deduction_requests ENABLE ROW LEVEL SECURITY;

-- Customers see their own requests
CREATE POLICY "Customer reads own requests"
  ON public.session_deduction_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

-- Admins see all
CREATE POLICY "Admin reads all requests"
  ON public.session_deduction_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only edge function (service role) writes; no client insert/update policies needed.
