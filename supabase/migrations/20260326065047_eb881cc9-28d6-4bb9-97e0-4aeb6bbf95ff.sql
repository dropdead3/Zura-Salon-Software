
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
  _lp record;
BEGIN
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

  -- 2. Scale level prices proportionally
  FOR _lp IN SELECT id, price FROM service_level_prices WHERE service_id = _service_id
  LOOP
    UPDATE service_level_prices
      SET price = ROUND((_lp.price * _ratio)::numeric, 2)
      WHERE id = _lp.id;
  END LOOP;

  -- 3. Scale location prices proportionally
  FOR _lp IN SELECT id, price FROM service_location_prices WHERE service_id = _service_id
  LOOP
    UPDATE service_location_prices
      SET price = ROUND((_lp.price * _ratio)::numeric, 2)
      WHERE id = _lp.id;
  END LOOP;

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
