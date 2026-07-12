
REVOKE EXECUTE ON FUNCTION public.validate_package_promotion() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_commission_entries_on_approval() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.snapshot_customer_package_fields() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
