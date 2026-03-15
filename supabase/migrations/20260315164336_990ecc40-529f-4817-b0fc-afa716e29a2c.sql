
-- Function: check_cost_alert_threshold
-- Called from within log_cost_price_change trigger to create notifications on cost spikes.
CREATE OR REPLACE FUNCTION public.check_cost_alert_threshold(
  _org_id uuid,
  _product_id uuid,
  _product_name text,
  _old_cost numeric,
  _new_cost numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_setting RECORD;
  v_threshold numeric;
  v_enabled boolean;
  v_change_pct numeric;
  v_admin RECORD;
BEGIN
  -- Read threshold from backroom_settings
  SELECT setting_value INTO v_setting
  FROM public.backroom_settings
  WHERE organization_id = _org_id
    AND location_id IS NULL
    AND setting_key = 'cost_alert_threshold';

  IF NOT FOUND THEN RETURN; END IF;

  v_enabled := (v_setting.setting_value->>'enabled')::boolean;
  v_threshold := COALESCE((v_setting.setting_value->>'threshold_pct')::numeric, 10);

  IF NOT v_enabled OR v_threshold <= 0 THEN RETURN; END IF;
  IF _old_cost IS NULL OR _old_cost <= 0 THEN RETURN; END IF;

  v_change_pct := ((_new_cost - _old_cost) / _old_cost) * 100;

  IF v_change_pct <= v_threshold THEN RETURN; END IF;

  -- Insert notification for each org admin
  FOR v_admin IN
    SELECT user_id FROM public.organization_admins WHERE organization_id = _org_id
  LOOP
    INSERT INTO public.platform_notifications (
      recipient_id, type, severity, title, message, metadata, link
    ) VALUES (
      v_admin.user_id,
      'cost_spike',
      CASE WHEN v_change_pct > v_threshold * 2 THEN 'critical' ELSE 'warning' END,
      'Cost Spike: ' || _product_name,
      'Cost increased by ' || round(v_change_pct, 1) || '% (from $' || round(_old_cost, 2) || ' to $' || round(_new_cost, 2) || ')',
      jsonb_build_object('product_id', _product_id, 'old_cost', _old_cost, 'new_cost', _new_cost, 'change_pct', round(v_change_pct, 1)),
      '/dashboard/admin/backroom-settings'
    );
  END LOOP;
END;
$$;

-- Update log_cost_price_change to also call check_cost_alert_threshold
CREATE OR REPLACE FUNCTION public.log_cost_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supplier_name TEXT;
BEGIN
  IF OLD.cost_price IS DISTINCT FROM NEW.cost_price AND NEW.cost_price IS NOT NULL THEN
    -- Try to resolve supplier name from product_suppliers via supplier_id
    IF NEW.supplier_id IS NOT NULL THEN
      SELECT supplier_name INTO v_supplier_name
      FROM public.product_suppliers
      WHERE id = NEW.supplier_id;
    END IF;

    INSERT INTO public.product_cost_history (product_id, organization_id, supplier_name, cost_price)
    VALUES (NEW.id, NEW.organization_id, v_supplier_name, NEW.cost_price);

    -- Check cost alert threshold
    PERFORM public.check_cost_alert_threshold(
      NEW.organization_id,
      NEW.id,
      NEW.name,
      OLD.cost_price,
      NEW.cost_price
    );
  END IF;
  RETURN NEW;
END;
$$;
