-- Wave 1: Booking surface parity — online override columns on services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS include_from_prefix BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS online_name TEXT,
  ADD COLUMN IF NOT EXISTS online_duration_override INTEGER,
  ADD COLUMN IF NOT EXISTS online_discount_pct NUMERIC(5,2);

-- Sanity constraints (validation triggers, not CHECKs, per project convention)
CREATE OR REPLACE FUNCTION public.validate_service_online_overrides()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.online_duration_override IS NOT NULL AND NEW.online_duration_override <= 0 THEN
    RAISE EXCEPTION 'online_duration_override must be greater than 0';
  END IF;
  IF NEW.online_discount_pct IS NOT NULL AND (NEW.online_discount_pct < 0 OR NEW.online_discount_pct > 100) THEN
    RAISE EXCEPTION 'online_discount_pct must be between 0 and 100';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_service_online_overrides_trigger ON public.services;
CREATE TRIGGER validate_service_online_overrides_trigger
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_online_overrides();