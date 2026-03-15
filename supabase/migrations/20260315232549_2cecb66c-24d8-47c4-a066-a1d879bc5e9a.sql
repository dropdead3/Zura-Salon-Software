
-- Add anti-abuse refund columns to backroom_location_entitlements
ALTER TABLE public.backroom_location_entitlements
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS prior_refund_count INTEGER NOT NULL DEFAULT 0;

-- Trigger: on INSERT, if a prior refunded row exists for the same (org, location),
-- copy prior_refund_count + 1 and nullify refund_eligible_until to block future refunds.
CREATE OR REPLACE FUNCTION public.guard_backroom_refund_reuse()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_prior_count INTEGER;
BEGIN
  -- Check if any prior row for this org+location was ever refunded
  SELECT MAX(prior_refund_count)
    INTO v_prior_count
    FROM public.backroom_location_entitlements
   WHERE organization_id = NEW.organization_id
     AND location_id = NEW.location_id
     AND refunded_at IS NOT NULL;

  IF v_prior_count IS NOT NULL THEN
    NEW.prior_refund_count := v_prior_count + 1;
    NEW.refund_eligible_until := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_backroom_refund_reuse ON public.backroom_location_entitlements;
CREATE TRIGGER trg_guard_backroom_refund_reuse
  BEFORE INSERT ON public.backroom_location_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.guard_backroom_refund_reuse();
