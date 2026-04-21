-- Wave 3: Compensation-aware policy applicability
-- Adds compensation profile fields to policy_org_profile + library gates.

ALTER TABLE public.policy_org_profile
  ADD COLUMN IF NOT EXISTS compensation_models_in_use text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS commission_basis_in_use text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS uses_tip_pooling boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS uses_refund_clawback boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_booth_renters boolean NOT NULL DEFAULT false;

ALTER TABLE public.policy_library
  ADD COLUMN IF NOT EXISTS requires_tip_pooling boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_refund_clawback boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_booth_rental boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_hourly_pay boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_product_cost_basis boolean NOT NULL DEFAULT false;

-- Auto-derive compensation_models_in_use whenever compensation_plans change.
CREATE OR REPLACE FUNCTION public.refresh_org_compensation_profile(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_models text[];
  v_basis text[];
  v_tip_pool boolean;
  v_clawback boolean;
  v_booth boolean;
BEGIN
  SELECT ARRAY_AGG(DISTINCT plan_type::text) INTO v_models
  FROM public.compensation_plans
  WHERE organization_id = p_org_id AND is_active = true;

  SELECT ARRAY_AGG(DISTINCT commission_basis::text) INTO v_basis
  FROM public.compensation_plans
  WHERE organization_id = p_org_id AND is_active = true;

  SELECT bool_or(tip_handling = 'pooled') INTO v_tip_pool
  FROM public.compensation_plans
  WHERE organization_id = p_org_id AND is_active = true;

  SELECT bool_or(refund_clawback) INTO v_clawback
  FROM public.compensation_plans
  WHERE organization_id = p_org_id AND is_active = true;

  SELECT bool_or(plan_type = 'booth_rental') INTO v_booth
  FROM public.compensation_plans
  WHERE organization_id = p_org_id AND is_active = true;

  -- Only update if profile exists; do not auto-create here.
  UPDATE public.policy_org_profile
  SET
    compensation_models_in_use = COALESCE(v_models, '{}'::text[]),
    commission_basis_in_use = COALESCE(v_basis, '{}'::text[]),
    uses_tip_pooling = COALESCE(v_tip_pool, false),
    uses_refund_clawback = COALESCE(v_clawback, false),
    has_booth_renters = COALESCE(v_booth, false),
    updated_at = now()
  WHERE organization_id = p_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.compensation_plans_refresh_profile_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_org_compensation_profile(
    COALESCE(NEW.organization_id, OLD.organization_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_comp_plans_refresh_profile ON public.compensation_plans;
CREATE TRIGGER trg_comp_plans_refresh_profile
AFTER INSERT OR UPDATE OR DELETE ON public.compensation_plans
FOR EACH ROW EXECUTE FUNCTION public.compensation_plans_refresh_profile_trigger();

-- Backfill once for existing orgs.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT organization_id FROM public.compensation_plans LOOP
    PERFORM public.refresh_org_compensation_profile(r.organization_id);
  END LOOP;
END $$;