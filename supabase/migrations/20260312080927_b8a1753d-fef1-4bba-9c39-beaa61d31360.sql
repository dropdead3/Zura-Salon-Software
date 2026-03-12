
-- =============================================
-- ZURA BACKROOM — Phase 1 Schema Migration
-- 8 new tables + RLS + indexes + realtime
-- =============================================

-- 1. Backroom Stations
CREATE TABLE IF NOT EXISTS public.backroom_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  station_name TEXT NOT NULL,
  assigned_device_id UUID,
  assigned_scale_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.backroom_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view stations"
  ON public.backroom_stations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage stations"
  ON public.backroom_stations FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_backroom_stations_org ON public.backroom_stations(organization_id);
CREATE INDEX IF NOT EXISTS idx_backroom_stations_location ON public.backroom_stations(location_id);

-- 2. Backroom Devices
CREATE TABLE IF NOT EXISTS public.backroom_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'scale',
  device_name TEXT NOT NULL,
  serial_number TEXT,
  connection_type TEXT NOT NULL DEFAULT 'manual',
  is_paired BOOLEAN NOT NULL DEFAULT false,
  paired_station_id UUID REFERENCES public.backroom_stations(id) ON DELETE SET NULL,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.backroom_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view devices"
  ON public.backroom_devices FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage devices"
  ON public.backroom_devices FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_backroom_devices_org ON public.backroom_devices(organization_id);

-- 3. Mix Sessions
CREATE TYPE public.mix_session_status AS ENUM ('draft', 'mixing', 'pending_reweigh', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.mix_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_id UUID,
  appointment_service_id UUID,
  client_id UUID,
  mixed_by_staff_id UUID,
  service_performed_by_staff_id UUID,
  station_id UUID REFERENCES public.backroom_stations(id) ON DELETE SET NULL,
  location_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status mix_session_status NOT NULL DEFAULT 'draft',
  is_manual_override BOOLEAN NOT NULL DEFAULT false,
  unresolved_flag BOOLEAN NOT NULL DEFAULT false,
  unresolved_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mix_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view mix sessions"
  ON public.mix_sessions FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create mix sessions"
  ON public.mix_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update mix sessions"
  ON public.mix_sessions FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_mix_sessions_org ON public.mix_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_mix_sessions_appointment ON public.mix_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_mix_sessions_client ON public.mix_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_mix_sessions_status ON public.mix_sessions(status);

-- Prevent concurrent active sessions for same appointment_service
CREATE UNIQUE INDEX IF NOT EXISTS idx_mix_sessions_active_per_service
  ON public.mix_sessions(appointment_id, appointment_service_id)
  WHERE status NOT IN ('completed', 'cancelled');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mix_sessions;

-- 4. Mix Bowls
CREATE TYPE public.mix_bowl_status AS ENUM ('open', 'sealed', 'reweighed', 'discarded');

CREATE TABLE IF NOT EXISTS public.mix_bowls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mix_session_id UUID NOT NULL REFERENCES public.mix_sessions(id) ON DELETE CASCADE,
  bowl_number INTEGER NOT NULL DEFAULT 1,
  bowl_name TEXT,
  purpose TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status mix_bowl_status NOT NULL DEFAULT 'open',
  total_dispensed_weight NUMERIC(10,2) DEFAULT 0,
  total_dispensed_cost NUMERIC(10,4) DEFAULT 0,
  leftover_weight NUMERIC(10,2),
  net_usage_weight NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mix_bowls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mix bowl access via session org"
  ON public.mix_bowls FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mix_sessions ms
    WHERE ms.id = mix_session_id
    AND public.is_org_member(auth.uid(), ms.organization_id)
  ));

CREATE POLICY "Mix bowl insert via session org"
  ON public.mix_bowls FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.mix_sessions ms
    WHERE ms.id = mix_session_id
    AND public.is_org_member(auth.uid(), ms.organization_id)
  ));

CREATE POLICY "Mix bowl update via session org"
  ON public.mix_bowls FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mix_sessions ms
    WHERE ms.id = mix_session_id
    AND public.is_org_member(auth.uid(), ms.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.mix_sessions ms
    WHERE ms.id = mix_session_id
    AND public.is_org_member(auth.uid(), ms.organization_id)
  ));

CREATE INDEX IF NOT EXISTS idx_mix_bowls_session ON public.mix_bowls(mix_session_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.mix_bowls;

-- 5. Mix Bowl Lines
CREATE TABLE IF NOT EXISTS public.mix_bowl_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bowl_id UUID NOT NULL REFERENCES public.mix_bowls(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  brand_snapshot TEXT,
  dispensed_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  dispensed_unit TEXT NOT NULL DEFAULT 'g',
  dispensed_cost_snapshot NUMERIC(10,4) NOT NULL DEFAULT 0,
  captured_via TEXT NOT NULL DEFAULT 'manual',
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mix_bowl_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bowl line access via bowl session org"
  ON public.mix_bowl_lines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mix_bowls mb
    JOIN public.mix_sessions ms ON ms.id = mb.mix_session_id
    WHERE mb.id = bowl_id
    AND public.is_org_member(auth.uid(), ms.organization_id)
  ));

CREATE POLICY "Bowl line insert via bowl session org"
  ON public.mix_bowl_lines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.mix_bowls mb
    JOIN public.mix_sessions ms ON ms.id = mb.mix_session_id
    WHERE mb.id = bowl_id
    AND public.is_org_member(auth.uid(), ms.organization_id)
  ));

CREATE POLICY "Bowl line update via bowl session org"
  ON public.mix_bowl_lines FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mix_bowls mb
    JOIN public.mix_sessions ms ON ms.id = mb.mix_session_id
    WHERE mb.id = bowl_id
    AND public.is_org_member(auth.uid(), ms.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.mix_bowls mb
    JOIN public.mix_sessions ms ON ms.id = mb.mix_session_id
    WHERE mb.id = bowl_id
    AND public.is_org_member(auth.uid(), ms.organization_id)
  ));

CREATE POLICY "Bowl line delete via bowl session org"
  ON public.mix_bowl_lines FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mix_bowls mb
    JOIN public.mix_sessions ms ON ms.id = mb.mix_session_id
    WHERE mb.id = bowl_id
    AND public.is_org_member(auth.uid(), ms.organization_id)
  ));

CREATE INDEX IF NOT EXISTS idx_mix_bowl_lines_bowl ON public.mix_bowl_lines(bowl_id);

-- 6. Reweigh Events
CREATE TABLE IF NOT EXISTS public.reweigh_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bowl_id UUID NOT NULL REFERENCES public.mix_bowls(id) ON DELETE CASCADE,
  mix_session_id UUID NOT NULL REFERENCES public.mix_sessions(id) ON DELETE CASCADE,
  leftover_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  leftover_unit TEXT NOT NULL DEFAULT 'g',
  captured_via TEXT NOT NULL DEFAULT 'manual',
  weighed_by_staff_id UUID,
  weighed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reweigh_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reweigh access via session org"
  ON public.reweigh_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mix_sessions ms
    WHERE ms.id = mix_session_id
    AND public.is_org_member(auth.uid(), ms.organization_id)
  ));

CREATE POLICY "Reweigh insert via session org"
  ON public.reweigh_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.mix_sessions ms
    WHERE ms.id = mix_session_id
    AND public.is_org_member(auth.uid(), ms.organization_id)
  ));

CREATE INDEX IF NOT EXISTS idx_reweigh_events_bowl ON public.reweigh_events(bowl_id);
CREATE INDEX IF NOT EXISTS idx_reweigh_events_session ON public.reweigh_events(mix_session_id);

-- 7. Waste Events
CREATE TYPE public.waste_category AS ENUM (
  'leftover_bowl_waste',
  'overmix_waste',
  'spill_waste',
  'expired_product_discard',
  'contamination_discard'
);

CREATE TABLE IF NOT EXISTS public.waste_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mix_session_id UUID NOT NULL REFERENCES public.mix_sessions(id) ON DELETE CASCADE,
  bowl_id UUID REFERENCES public.mix_bowls(id) ON DELETE SET NULL,
  waste_category waste_category NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'g',
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  notes TEXT,
  recorded_by_staff_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.waste_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Waste access via session org"
  ON public.waste_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mix_sessions ms
    WHERE ms.id = mix_session_id
    AND public.is_org_member(auth.uid(), ms.organization_id)
  ));

CREATE POLICY "Waste insert via session org"
  ON public.waste_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.mix_sessions ms
    WHERE ms.id = mix_session_id
    AND public.is_org_member(auth.uid(), ms.organization_id)
  ));

CREATE INDEX IF NOT EXISTS idx_waste_events_session ON public.waste_events(mix_session_id);

-- 8. Client Formula History
CREATE TYPE public.formula_type AS ENUM ('actual', 'refined');

CREATE TABLE IF NOT EXISTS public.client_formula_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID,
  appointment_id UUID,
  appointment_service_id UUID,
  mix_session_id UUID REFERENCES public.mix_sessions(id) ON DELETE SET NULL,
  service_name TEXT,
  formula_type formula_type NOT NULL DEFAULT 'actual',
  formula_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  staff_id UUID,
  staff_name TEXT,
  notes TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_formula_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view formula history"
  ON public.client_formula_history FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create formula history"
  ON public.client_formula_history FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_formula_history_org ON public.client_formula_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_formula_history_client ON public.client_formula_history(client_id);
CREATE INDEX IF NOT EXISTS idx_formula_history_appointment ON public.client_formula_history(appointment_id);
CREATE INDEX IF NOT EXISTS idx_formula_history_session ON public.client_formula_history(mix_session_id);

-- Updated_at triggers for tables that have updated_at
CREATE OR REPLACE FUNCTION public.update_backroom_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_backroom_stations_updated_at
  BEFORE UPDATE ON public.backroom_stations
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE TRIGGER update_mix_sessions_updated_at
  BEFORE UPDATE ON public.mix_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE TRIGGER update_mix_bowls_updated_at
  BEFORE UPDATE ON public.mix_bowls
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();
