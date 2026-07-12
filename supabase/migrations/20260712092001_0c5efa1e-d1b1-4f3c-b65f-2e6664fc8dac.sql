ALTER TABLE public.customer_packages REPLICA IDENTITY FULL;
ALTER TABLE public.usage_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_packages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.usage_logs;