
-- =====================================================
-- Projection + Read Model Tables for Zura Backroom
-- =====================================================

-- 1. mix_bowl_projections — Fast bowl-state view
CREATE TABLE IF NOT EXISTS public.mix_bowl_projections (
  mix_bowl_id UUID PRIMARY KEY REFERENCES public.mix_bowls(id) ON DELETE CASCADE,
  mix_session_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bowl_number INTEGER DEFAULT 1,
  purpose TEXT,
  current_status TEXT DEFAULT 'open',
  line_item_count INTEGER DEFAULT 0,
  dispensed_total NUMERIC(10,2) DEFAULT 0,
  estimated_cost NUMERIC(10,4) DEFAULT 0,
  leftover_total NUMERIC(10,2) DEFAULT 0,
  net_usage_total NUMERIC(10,2) DEFAULT 0,
  has_reweigh BOOLEAN DEFAULT false,
  last_event_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mix_bowl_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view bowl projections"
  ON public.mix_bowl_projections FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "System can insert bowl projections"
  ON public.mix_bowl_projections FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "System can update bowl projections"
  ON public.mix_bowl_projections FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_mix_bowl_proj_session ON public.mix_bowl_projections(mix_session_id);
CREATE INDEX IF NOT EXISTS idx_mix_bowl_proj_org ON public.mix_bowl_projections(organization_id);

-- 2. checkout_usage_projections — Pre-computed checkout charge summary
CREATE TABLE IF NOT EXISTS public.checkout_usage_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_id UUID,
  appointment_service_id UUID,
  mix_session_id UUID,
  client_id UUID,
  total_dispensed_weight NUMERIC(10,2) DEFAULT 0,
  total_dispensed_cost NUMERIC(10,4) DEFAULT 0,
  service_allowance_grams NUMERIC(10,2),
  overage_grams NUMERIC(10,2) DEFAULT 0,
  overage_charge NUMERIC(10,4) DEFAULT 0,
  requires_manager_review BOOLEAN DEFAULT false,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, mix_session_id)
);

ALTER TABLE public.checkout_usage_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view checkout projections"
  ON public.checkout_usage_projections FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert checkout projections"
  ON public.checkout_usage_projections FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update checkout projections"
  ON public.checkout_usage_projections FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_checkout_proj_appt ON public.checkout_usage_projections(appointment_id);
CREATE INDEX IF NOT EXISTS idx_checkout_proj_session ON public.checkout_usage_projections(mix_session_id);
CREATE INDEX IF NOT EXISTS idx_checkout_proj_org ON public.checkout_usage_projections(organization_id);

-- 3. inventory_risk_projections — Low-stock alerts, depletion forecasting
CREATE TABLE IF NOT EXISTS public.inventory_risk_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id TEXT,
  current_on_hand NUMERIC DEFAULT 0,
  avg_daily_usage NUMERIC(10,4) DEFAULT 0,
  projected_depletion_date DATE,
  stockout_risk_level TEXT DEFAULT 'none',
  recommended_order_qty NUMERIC DEFAULT 0,
  open_po_quantity NUMERIC DEFAULT 0,
  last_forecast_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, product_id, location_id)
);

ALTER TABLE public.inventory_risk_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inventory risk"
  ON public.inventory_risk_projections FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "System can manage inventory risk"
  ON public.inventory_risk_projections FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_inv_risk_org ON public.inventory_risk_projections(organization_id, stockout_risk_level);
CREATE INDEX IF NOT EXISTS idx_inv_risk_product ON public.inventory_risk_projections(product_id);

-- 4. service_profitability_snapshots — Per-service contribution margin
CREATE TABLE IF NOT EXISTS public.service_profitability_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  appointment_id UUID,
  appointment_service_id UUID,
  staff_id UUID,
  service_name TEXT,
  service_revenue NUMERIC(10,2) DEFAULT 0,
  product_cost NUMERIC(10,4) DEFAULT 0,
  overage_revenue NUMERIC(10,4) DEFAULT 0,
  waste_cost NUMERIC(10,4) DEFAULT 0,
  contribution_margin NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.service_profitability_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view profitability"
  ON public.service_profitability_snapshots FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "System can manage profitability snapshots"
  ON public.service_profitability_snapshots FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_svc_profit_org ON public.service_profitability_snapshots(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_svc_profit_staff ON public.service_profitability_snapshots(staff_id);

-- 5. staff_backroom_performance — Stylist/assistant analytics aggregates
CREATE TABLE IF NOT EXISTS public.staff_backroom_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL,
  location_id TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  mix_session_count INTEGER DEFAULT 0,
  manual_override_rate NUMERIC(5,2) DEFAULT 0,
  reweigh_compliance_rate NUMERIC(5,2) DEFAULT 0,
  avg_usage_variance NUMERIC(5,2) DEFAULT 0,
  waste_rate NUMERIC(5,2) DEFAULT 0,
  total_dispensed_weight NUMERIC(10,2) DEFAULT 0,
  total_product_cost NUMERIC(10,4) DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, staff_id, location_id, period_start, period_end)
);

ALTER TABLE public.staff_backroom_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view staff performance"
  ON public.staff_backroom_performance FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "System can manage staff performance"
  ON public.staff_backroom_performance FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_staff_perf_org ON public.staff_backroom_performance(organization_id, period_start);
CREATE INDEX IF NOT EXISTS idx_staff_perf_staff ON public.staff_backroom_performance(staff_id);

-- =====================================================
-- Extended trigger: update bowl projections on events
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_mix_session_projection_on_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bowl_id UUID;
  v_dispensed_qty NUMERIC;
  v_dispensed_cost NUMERIC;
  v_leftover_qty NUMERIC;
  v_bowl_status TEXT;
  v_bowl_purpose TEXT;
  v_bowl_number INTEGER;
BEGIN
  -- === Session-level projection (existing logic) ===
  INSERT INTO mix_session_projections (
    mix_session_id, organization_id, current_status,
    last_event_sequence, last_event_at, updated_at,
    has_manual_override, has_device_disconnect
  )
  VALUES (
    NEW.mix_session_id, NEW.organization_id, 'draft',
    NEW.sequence_number, NEW.created_at, now(),
    NEW.event_type = 'manual_override_used',
    NEW.event_type = 'device_disconnected'
  )
  ON CONFLICT (mix_session_id)
  DO UPDATE SET
    last_event_sequence = GREATEST(mix_session_projections.last_event_sequence, NEW.sequence_number),
    last_event_at = NEW.created_at,
    updated_at = now(),
    -- Update status based on event type
    current_status = CASE
      WHEN NEW.event_type = 'session_started' THEN 'active'
      WHEN NEW.event_type = 'session_awaiting_reweigh' THEN 'awaiting_reweigh'
      WHEN NEW.event_type = 'session_completed' THEN 'completed'
      WHEN NEW.event_type = 'session_marked_unresolved' THEN 'unresolved_exception'
      ELSE mix_session_projections.current_status
    END,
    -- Increment bowl counts
    active_bowl_count = CASE
      WHEN NEW.event_type = 'bowl_created' THEN mix_session_projections.active_bowl_count + 1
      WHEN NEW.event_type = 'bowl_sealed' THEN GREATEST(0, mix_session_projections.active_bowl_count - 1)
      WHEN NEW.event_type = 'bowl_discarded' THEN GREATEST(0, mix_session_projections.active_bowl_count - 1)
      ELSE mix_session_projections.active_bowl_count
    END,
    sealed_bowl_count = CASE
      WHEN NEW.event_type = 'bowl_sealed' THEN mix_session_projections.sealed_bowl_count + 1
      ELSE mix_session_projections.sealed_bowl_count
    END,
    reweighed_bowl_count = CASE
      WHEN NEW.event_type = 'reweigh_captured' THEN mix_session_projections.reweighed_bowl_count + 1
      ELSE mix_session_projections.reweighed_bowl_count
    END,
    -- Update line items count
    total_line_items = CASE
      WHEN NEW.event_type = 'line_item_recorded' THEN mix_session_projections.total_line_items + 1
      WHEN NEW.event_type = 'line_item_removed' THEN GREATEST(0, mix_session_projections.total_line_items - 1)
      ELSE mix_session_projections.total_line_items
    END,
    -- Update running totals
    running_dispensed_weight = CASE
      WHEN NEW.event_type = 'line_item_recorded' THEN
        mix_session_projections.running_dispensed_weight + COALESCE((NEW.event_payload->>'dispensed_quantity')::NUMERIC, 0)
      WHEN NEW.event_type = 'line_item_removed' THEN
        GREATEST(0, mix_session_projections.running_dispensed_weight - COALESCE((NEW.event_payload->>'dispensed_quantity')::NUMERIC, 0))
      ELSE mix_session_projections.running_dispensed_weight
    END,
    running_estimated_cost = CASE
      WHEN NEW.event_type = 'line_item_recorded' THEN
        mix_session_projections.running_estimated_cost + COALESCE(
          (NEW.event_payload->>'dispensed_quantity')::NUMERIC * (NEW.event_payload->>'dispensed_cost_snapshot')::NUMERIC, 0
        )
      WHEN NEW.event_type = 'line_item_removed' THEN
        GREATEST(0, mix_session_projections.running_estimated_cost - COALESCE(
          (NEW.event_payload->>'dispensed_quantity')::NUMERIC * (NEW.event_payload->>'dispensed_cost_snapshot')::NUMERIC, 0
        ))
      ELSE mix_session_projections.running_estimated_cost
    END,
    -- Update flags
    has_manual_override = mix_session_projections.has_manual_override OR NEW.event_type = 'manual_override_used',
    has_device_disconnect = mix_session_projections.has_device_disconnect OR NEW.event_type = 'device_disconnected',
    awaiting_reweigh_count = CASE
      WHEN NEW.event_type = 'bowl_sealed' THEN mix_session_projections.awaiting_reweigh_count + 1
      WHEN NEW.event_type = 'reweigh_captured' THEN GREATEST(0, mix_session_projections.awaiting_reweigh_count - 1)
      ELSE mix_session_projections.awaiting_reweigh_count
    END,
    unresolved_flag = CASE
      WHEN NEW.event_type = 'session_marked_unresolved' THEN true
      WHEN NEW.event_type = 'session_completed' THEN false
      ELSE mix_session_projections.unresolved_flag
    END;

  -- === Bowl-level projection ===
  v_bowl_id := (NEW.event_payload->>'bowl_id')::UUID;

  IF NEW.event_type = 'bowl_created' AND v_bowl_id IS NOT NULL THEN
    v_bowl_number := COALESCE((NEW.event_payload->>'bowl_number')::INTEGER, 1);
    v_bowl_purpose := NEW.event_payload->>'purpose';
    INSERT INTO mix_bowl_projections (
      mix_bowl_id, mix_session_id, organization_id,
      bowl_number, purpose, current_status,
      last_event_at, updated_at
    ) VALUES (
      v_bowl_id, NEW.mix_session_id, NEW.organization_id,
      v_bowl_number, v_bowl_purpose, 'open',
      NEW.created_at, now()
    )
    ON CONFLICT (mix_bowl_id) DO UPDATE SET
      updated_at = now(),
      last_event_at = NEW.created_at;

  ELSIF v_bowl_id IS NOT NULL AND NEW.event_type IN (
    'line_item_recorded', 'line_item_removed', 'bowl_sealed', 'bowl_discarded', 'reweigh_captured'
  ) THEN
    v_dispensed_qty := COALESCE((NEW.event_payload->>'dispensed_quantity')::NUMERIC, 0);
    v_dispensed_cost := COALESCE(
      (NEW.event_payload->>'dispensed_quantity')::NUMERIC * (NEW.event_payload->>'dispensed_cost_snapshot')::NUMERIC, 0
    );
    v_leftover_qty := COALESCE((NEW.event_payload->>'leftover_quantity')::NUMERIC, 0);

    UPDATE mix_bowl_projections SET
      line_item_count = CASE
        WHEN NEW.event_type = 'line_item_recorded' THEN line_item_count + 1
        WHEN NEW.event_type = 'line_item_removed' THEN GREATEST(0, line_item_count - 1)
        ELSE line_item_count
      END,
      dispensed_total = CASE
        WHEN NEW.event_type = 'line_item_recorded' THEN dispensed_total + v_dispensed_qty
        WHEN NEW.event_type = 'line_item_removed' THEN GREATEST(0, dispensed_total - v_dispensed_qty)
        ELSE dispensed_total
      END,
      estimated_cost = CASE
        WHEN NEW.event_type = 'line_item_recorded' THEN estimated_cost + v_dispensed_cost
        WHEN NEW.event_type = 'line_item_removed' THEN GREATEST(0, estimated_cost - v_dispensed_cost)
        ELSE estimated_cost
      END,
      current_status = CASE
        WHEN NEW.event_type = 'bowl_sealed' THEN 'sealed'
        WHEN NEW.event_type = 'bowl_discarded' THEN 'discarded'
        WHEN NEW.event_type = 'reweigh_captured' THEN 'reweighed'
        ELSE current_status
      END,
      leftover_total = CASE
        WHEN NEW.event_type = 'reweigh_captured' THEN v_leftover_qty
        ELSE leftover_total
      END,
      net_usage_total = CASE
        WHEN NEW.event_type = 'reweigh_captured' THEN GREATEST(0, dispensed_total - v_leftover_qty)
        ELSE net_usage_total
      END,
      has_reweigh = CASE
        WHEN NEW.event_type = 'reweigh_captured' THEN true
        ELSE has_reweigh
      END,
      last_event_at = NEW.created_at,
      updated_at = now()
    WHERE mix_bowl_id = v_bowl_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- =====================================================
-- Rebuild functions
-- =====================================================

-- Rebuild a single session's projection by replaying events
CREATE OR REPLACE FUNCTION public.rebuild_mix_session_projection(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event RECORD;
  v_org_id UUID;
BEGIN
  -- Get org from first event
  SELECT organization_id INTO v_org_id
  FROM mix_session_events
  WHERE mix_session_id = p_session_id
  ORDER BY sequence_number ASC LIMIT 1;

  IF v_org_id IS NULL THEN RETURN; END IF;

  -- Reset session projection
  DELETE FROM mix_session_projections WHERE mix_session_id = p_session_id;

  -- Reset bowl projections for this session
  DELETE FROM mix_bowl_projections WHERE mix_session_id = p_session_id;

  -- Replay events in order — the trigger handles projection updates
  -- We re-insert temporarily to fire the trigger, but we use a direct approach instead:
  -- Simply iterate and apply the same logic
  INSERT INTO mix_session_projections (
    mix_session_id, organization_id, current_status,
    last_event_sequence, last_event_at, updated_at
  ) VALUES (
    p_session_id, v_org_id, 'draft', 0, now(), now()
  );

  FOR v_event IN
    SELECT * FROM mix_session_events
    WHERE mix_session_id = p_session_id
    ORDER BY sequence_number ASC
  LOOP
    -- Apply session-level updates
    UPDATE mix_session_projections SET
      last_event_sequence = v_event.sequence_number,
      last_event_at = v_event.created_at,
      updated_at = now(),
      current_status = CASE
        WHEN v_event.event_type = 'session_started' THEN 'active'
        WHEN v_event.event_type = 'session_awaiting_reweigh' THEN 'awaiting_reweigh'
        WHEN v_event.event_type = 'session_completed' THEN 'completed'
        WHEN v_event.event_type = 'session_marked_unresolved' THEN 'unresolved_exception'
        ELSE current_status
      END,
      active_bowl_count = CASE
        WHEN v_event.event_type = 'bowl_created' THEN active_bowl_count + 1
        WHEN v_event.event_type IN ('bowl_sealed', 'bowl_discarded') THEN GREATEST(0, active_bowl_count - 1)
        ELSE active_bowl_count
      END,
      sealed_bowl_count = CASE
        WHEN v_event.event_type = 'bowl_sealed' THEN sealed_bowl_count + 1
        ELSE sealed_bowl_count
      END,
      reweighed_bowl_count = CASE
        WHEN v_event.event_type = 'reweigh_captured' THEN reweighed_bowl_count + 1
        ELSE reweighed_bowl_count
      END,
      total_line_items = CASE
        WHEN v_event.event_type = 'line_item_recorded' THEN total_line_items + 1
        WHEN v_event.event_type = 'line_item_removed' THEN GREATEST(0, total_line_items - 1)
        ELSE total_line_items
      END,
      running_dispensed_weight = CASE
        WHEN v_event.event_type = 'line_item_recorded' THEN
          running_dispensed_weight + COALESCE((v_event.event_payload->>'dispensed_quantity')::NUMERIC, 0)
        WHEN v_event.event_type = 'line_item_removed' THEN
          GREATEST(0, running_dispensed_weight - COALESCE((v_event.event_payload->>'dispensed_quantity')::NUMERIC, 0))
        ELSE running_dispensed_weight
      END,
      running_estimated_cost = CASE
        WHEN v_event.event_type = 'line_item_recorded' THEN
          running_estimated_cost + COALESCE(
            (v_event.event_payload->>'dispensed_quantity')::NUMERIC * (v_event.event_payload->>'dispensed_cost_snapshot')::NUMERIC, 0
          )
        WHEN v_event.event_type = 'line_item_removed' THEN
          GREATEST(0, running_estimated_cost - COALESCE(
            (v_event.event_payload->>'dispensed_quantity')::NUMERIC * (v_event.event_payload->>'dispensed_cost_snapshot')::NUMERIC, 0
          ))
        ELSE running_estimated_cost
      END,
      has_manual_override = has_manual_override OR v_event.event_type = 'manual_override_used',
      has_device_disconnect = has_device_disconnect OR v_event.event_type = 'device_disconnected',
      awaiting_reweigh_count = CASE
        WHEN v_event.event_type = 'bowl_sealed' THEN awaiting_reweigh_count + 1
        WHEN v_event.event_type = 'reweigh_captured' THEN GREATEST(0, awaiting_reweigh_count - 1)
        ELSE awaiting_reweigh_count
      END,
      unresolved_flag = CASE
        WHEN v_event.event_type = 'session_marked_unresolved' THEN true
        WHEN v_event.event_type = 'session_completed' THEN false
        ELSE unresolved_flag
      END
    WHERE mix_session_id = p_session_id;

    -- Apply bowl-level updates
    IF v_event.event_type = 'bowl_created' AND (v_event.event_payload->>'bowl_id') IS NOT NULL THEN
      INSERT INTO mix_bowl_projections (
        mix_bowl_id, mix_session_id, organization_id,
        bowl_number, purpose, current_status,
        last_event_at, updated_at
      ) VALUES (
        (v_event.event_payload->>'bowl_id')::UUID, p_session_id, v_org_id,
        COALESCE((v_event.event_payload->>'bowl_number')::INTEGER, 1),
        v_event.event_payload->>'purpose', 'open',
        v_event.created_at, now()
      )
      ON CONFLICT (mix_bowl_id) DO NOTHING;

    ELSIF (v_event.event_payload->>'bowl_id') IS NOT NULL AND v_event.event_type IN (
      'line_item_recorded', 'line_item_removed', 'bowl_sealed', 'bowl_discarded', 'reweigh_captured'
    ) THEN
      UPDATE mix_bowl_projections SET
        line_item_count = CASE
          WHEN v_event.event_type = 'line_item_recorded' THEN line_item_count + 1
          WHEN v_event.event_type = 'line_item_removed' THEN GREATEST(0, line_item_count - 1)
          ELSE line_item_count
        END,
        dispensed_total = CASE
          WHEN v_event.event_type = 'line_item_recorded' THEN dispensed_total + COALESCE((v_event.event_payload->>'dispensed_quantity')::NUMERIC, 0)
          WHEN v_event.event_type = 'line_item_removed' THEN GREATEST(0, dispensed_total - COALESCE((v_event.event_payload->>'dispensed_quantity')::NUMERIC, 0))
          ELSE dispensed_total
        END,
        estimated_cost = CASE
          WHEN v_event.event_type = 'line_item_recorded' THEN estimated_cost + COALESCE(
            (v_event.event_payload->>'dispensed_quantity')::NUMERIC * (v_event.event_payload->>'dispensed_cost_snapshot')::NUMERIC, 0)
          WHEN v_event.event_type = 'line_item_removed' THEN GREATEST(0, estimated_cost - COALESCE(
            (v_event.event_payload->>'dispensed_quantity')::NUMERIC * (v_event.event_payload->>'dispensed_cost_snapshot')::NUMERIC, 0))
          ELSE estimated_cost
        END,
        current_status = CASE
          WHEN v_event.event_type = 'bowl_sealed' THEN 'sealed'
          WHEN v_event.event_type = 'bowl_discarded' THEN 'discarded'
          WHEN v_event.event_type = 'reweigh_captured' THEN 'reweighed'
          ELSE current_status
        END,
        leftover_total = CASE
          WHEN v_event.event_type = 'reweigh_captured' THEN COALESCE((v_event.event_payload->>'leftover_quantity')::NUMERIC, 0)
          ELSE leftover_total
        END,
        net_usage_total = CASE
          WHEN v_event.event_type = 'reweigh_captured' THEN GREATEST(0, dispensed_total - COALESCE((v_event.event_payload->>'leftover_quantity')::NUMERIC, 0))
          ELSE net_usage_total
        END,
        has_reweigh = CASE
          WHEN v_event.event_type = 'reweigh_captured' THEN true
          ELSE has_reweigh
        END,
        last_event_at = v_event.created_at,
        updated_at = now()
      WHERE mix_bowl_id = (v_event.event_payload->>'bowl_id')::UUID;
    END IF;
  END LOOP;
END;
$function$;
