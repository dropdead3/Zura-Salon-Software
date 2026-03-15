
ALTER TABLE public.backroom_location_entitlements
ADD COLUMN IF NOT EXISTS refund_eligible_until TIMESTAMPTZ;

-- Backfill existing rows
UPDATE public.backroom_location_entitlements
SET refund_eligible_until = (activated_at::timestamptz + interval '30 days')
WHERE refund_eligible_until IS NULL;

-- Trigger function to auto-set refund_eligible_until on insert
CREATE OR REPLACE FUNCTION public.set_refund_eligible_until()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.refund_eligible_until IS NULL THEN
    NEW.refund_eligible_until := NEW.activated_at::timestamptz + interval '30 days';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_refund_eligible_until
  BEFORE INSERT ON public.backroom_location_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_refund_eligible_until();
