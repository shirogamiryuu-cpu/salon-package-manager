
-- Snapshot package details onto customer_packages so customers keep the package if admin deletes it
ALTER TABLE public.customer_packages
  ADD COLUMN IF NOT EXISTS package_name text,
  ADD COLUMN IF NOT EXISTS package_description text,
  ADD COLUMN IF NOT EXISTS package_image_url text;

UPDATE public.customer_packages cp
SET package_name = p.name,
    package_description = COALESCE(cp.package_description, p.description),
    package_image_url = COALESCE(cp.package_image_url, p.image_url)
FROM public.packages p
WHERE cp.package_id = p.id AND cp.package_name IS NULL;

-- Trigger to snapshot on insert
CREATE OR REPLACE FUNCTION public.snapshot_customer_package_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.package_id IS NOT NULL AND (NEW.package_name IS NULL OR NEW.package_name = '') THEN
    SELECT name, description, image_url
      INTO NEW.package_name, NEW.package_description, NEW.package_image_url
      FROM public.packages WHERE id = NEW.package_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_customer_package ON public.customer_packages;
CREATE TRIGGER trg_snapshot_customer_package
BEFORE INSERT ON public.customer_packages
FOR EACH ROW EXECUTE FUNCTION public.snapshot_customer_package_fields();

-- Allow package_id to become NULL when the source package is deleted
ALTER TABLE public.customer_packages ALTER COLUMN package_id DROP NOT NULL;

ALTER TABLE public.customer_packages
  DROP CONSTRAINT IF EXISTS customer_packages_package_id_fkey;
ALTER TABLE public.customer_packages
  ADD CONSTRAINT customer_packages_package_id_fkey
  FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE SET NULL;
