-- 1. Add auth guard + replace loops with bulk UPDATEs + add index

-- Replace the accept function with auth guard and bulk updates
CREATE OR REPLACE FUNCTION public.accept_price_recommendation(
  _org_id uuid,
  _service_id uuid,
  _current_price numeric,
  _recommended_price numeric,
  _product_cost numeric,
  _margin_pct_current numeric,
  _margin_pct_target numeric,
  _user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ratio numeric;
BEGIN
  -- Authorization guard: only org admins can modify prices
  IF NOT public.is_org_admin(auth.uid(), _org_id) THEN
    RAISE EXCEPTION 'unauthorized: caller is not an admin of this organization';
  END IF;

  -- Calculate scaling ratio
  IF _current_price > 0 THEN
    _ratio := _recommended_price / _current_price;
  ELSE
    _ratio := 1;
  END IF;

  -- 1. Update base service price
  UPDATE services
    SET price = _recommended_price, updated_at = now()
    WHERE id = _service_id AND organization_id = _org_id;

  -- 2. Scale level prices proportionally (bulk UPDATE, no loop)
  UPDATE service_level_prices
    SET price = ROUND((price * _ratio)::numeric, 2)
    WHERE service_id = _service_id;

  -- 3. Scale location prices proportionally (bulk UPDATE, no loop)
  UPDATE service_location_prices
    SET price = ROUND((price * _ratio)::numeric, 2)
    WHERE service_id = _service_id;

  -- 4. Log the acceptance
  INSERT INTO service_price_recommendations (
    organization_id, service_id, current_price, recommended_price,
    product_cost, margin_pct_current, margin_pct_target,
    status, accepted_at, accepted_by
  ) VALUES (
    _org_id, _service_id, _current_price, _recommended_price,
    _product_cost, _margin_pct_current, _margin_pct_target,
    'accepted', now(), _user_id
  );
END;
$$;

-- 2. Revert function for undoing accepted recommendations
CREATE OR REPLACE FUNCTION public.revert_price_recommendation(
  _recommendation_id uuid,
  _user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec record;
  _ratio numeric;
BEGIN
  -- Fetch the recommendation
  SELECT * INTO _rec FROM service_price_recommendations WHERE id = _recommendation_id AND status = 'accepted';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'recommendation not found or not in accepted status';
  END IF;

  -- Authorization guard
  IF NOT public.is_org_admin(auth.uid(), _rec.organization_id) THEN
    RAISE EXCEPTION 'unauthorized: caller is not an admin of this organization';
  END IF;

  -- Calculate reverse ratio
  IF _rec.recommended_price > 0 THEN
    _ratio := _rec.current_price / _rec.recommended_price;
  ELSE
    _ratio := 1;
  END IF;

  -- 1. Revert base service price
  UPDATE services
    SET price = _rec.current_price, updated_at = now()
    WHERE id = _rec.service_id AND organization_id = _rec.organization_id;

  -- 2. Scale level prices back
  UPDATE service_level_prices
    SET price = ROUND((price * _ratio)::numeric, 2)
    WHERE service_id = _rec.service_id;

  -- 3. Scale location prices back
  UPDATE service_location_prices
    SET price = ROUND((price * _ratio)::numeric, 2)
    WHERE service_id = _rec.service_id;

  -- 4. Mark as reverted
  UPDATE service_price_recommendations
    SET status = 'reverted'
    WHERE id = _recommendation_id;

  -- 5. Log the revert action
  INSERT INTO service_price_recommendations (
    organization_id, service_id, current_price, recommended_price,
    product_cost, margin_pct_current, margin_pct_target,
    status, accepted_at, accepted_by
  ) VALUES (
    _rec.organization_id, _rec.service_id, _rec.recommended_price, _rec.current_price,
    _rec.product_cost, _rec.margin_pct_target, _rec.margin_pct_current,
    'reverted', now(), _user_id
  );
END;
$$;

-- 3. Add index for fast dismissed/history lookups
CREATE INDEX IF NOT EXISTS idx_spr_org_service_status
  ON public.service_price_recommendations(organization_id, service_id, status);