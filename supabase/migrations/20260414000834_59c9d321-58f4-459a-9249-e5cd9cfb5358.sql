-- Add stripe_connect_status to locations for per-location Connect account tracking
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT NOT NULL DEFAULT 'not_connected';

-- Add a check constraint for valid values
ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_stripe_connect_status_check;

-- Use a validation trigger instead of CHECK constraint (per project conventions)
CREATE OR REPLACE FUNCTION public.validate_location_stripe_connect_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.stripe_connect_status NOT IN ('not_connected', 'pending', 'active') THEN
    RAISE EXCEPTION 'Invalid stripe_connect_status: %. Must be not_connected, pending, or active.', NEW.stripe_connect_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_location_stripe_connect_status_trigger ON public.locations;
CREATE TRIGGER validate_location_stripe_connect_status_trigger
  BEFORE INSERT OR UPDATE OF stripe_connect_status ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_location_stripe_connect_status();