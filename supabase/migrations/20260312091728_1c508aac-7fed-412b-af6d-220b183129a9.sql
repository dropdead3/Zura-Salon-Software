
-- ============================================================
-- Mix Session Event Stream + Projection Tables
-- ============================================================

-- 1. Create mix_session_events (append-only event ledger)
CREATE TABLE IF NOT EXISTS public.mix_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mix_session_id UUID NOT NULL REFERENCES public.mix_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}',
  sequence_number INTEGER NOT NULL,
  source_mode TEXT NOT NULL DEFAULT 'manual',
  device_id UUID,
  station_id UUID,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (mix_session_id, sequence_number)
);

-- Unique constraint for idempotency (only on non-null keys)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mix_session_events_idempotency
  ON public.mix_session_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_mix_session_events_session
  ON public.mix_session_events (mix_session_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_mix_session_events_org
  ON public.mix_session_events (organization_id);

CREATE INDEX IF NOT EXISTS idx_mix_session_events_type
  ON public.mix_session_events (event_type);

-- Enable RLS
ALTER TABLE public.mix_session_events ENABLE ROW LEVEL SECURITY;

-- RLS: Org members can read
CREATE POLICY "Org members can view mix session events"
  ON public.mix_session_events FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- RLS: Org members can insert
CREATE POLICY "Org members can insert mix session events"
  ON public.mix_session_events FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- RLS: Immutability — block UPDATE
CREATE POLICY "Mix session events are immutable (no update)"
  ON public.mix_session_events FOR UPDATE
  USING (false);

-- RLS: Immutability — block DELETE
CREATE POLICY "Mix session events are immutable (no delete)"
  ON public.mix_session_events FOR DELETE
  USING (false);

-- 2. Create mix_session_projections (read-optimized view)
CREATE TABLE IF NOT EXISTS public.mix_session_projections (
  mix_session_id UUID PRIMARY KEY REFERENCES public.mix_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  current_status TEXT NOT NULL DEFAULT 'draft',
  active_bowl_count INTEGER NOT NULL DEFAULT 0,
  sealed_bowl_count INTEGER NOT NULL DEFAULT 0,
  reweighed_bowl_count INTEGER NOT NULL DEFAULT 0,
  total_line_items INTEGER NOT NULL DEFAULT 0,
  running_dispensed_weight NUMERIC(10,2) NOT NULL DEFAULT 0,
  running_estimated_cost NUMERIC(10,4) NOT NULL DEFAULT 0,
  has_manual_override BOOLEAN NOT NULL DEFAULT false,
  has_device_disconnect BOOLEAN NOT NULL DEFAULT false,
  awaiting_reweigh_count INTEGER NOT NULL DEFAULT 0,
  unresolved_flag BOOLEAN NOT NULL DEFAULT false,
  last_event_sequence INTEGER NOT NULL DEFAULT 0,
  last_event_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mix_session_projections ENABLE ROW LEVEL SECURITY;

-- RLS: Org members can read
CREATE POLICY "Org members can view mix session projections"
  ON public.mix_session_projections FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- RLS: Org members can insert (via service layer)
CREATE POLICY "Org members can insert mix session projections"
  ON public.mix_session_projections FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- RLS: Org members can update (projection is mutable)
CREATE POLICY "Org members can update mix session projections"
  ON public.mix_session_projections FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Index for org-level queries
CREATE INDEX IF NOT EXISTS idx_mix_session_projections_org
  ON public.mix_session_projections (organization_id);

-- 3. Trigger: update projection on event insert
CREATE OR REPLACE FUNCTION public.update_mix_session_projection_on_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Upsert projection with latest event metadata
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
    -- Status transitions based on event type
    current_status = CASE
      WHEN NEW.event_type = 'session_started' THEN 'active'
      WHEN NEW.event_type = 'session_awaiting_reweigh' THEN 'awaiting_reweigh'
      WHEN NEW.event_type = 'session_completed' THEN 'completed'
      WHEN NEW.event_type = 'session_marked_unresolved' THEN 'unresolved_exception'
      ELSE mix_session_projections.current_status
    END,
    -- Counters
    active_bowl_count = mix_session_projections.active_bowl_count +
      CASE WHEN NEW.event_type = 'bowl_created' THEN 1
           WHEN NEW.event_type IN ('bowl_sealed', 'bowl_discarded') THEN -1
           ELSE 0 END,
    sealed_bowl_count = mix_session_projections.sealed_bowl_count +
      CASE WHEN NEW.event_type = 'bowl_sealed' THEN 1 ELSE 0 END,
    reweighed_bowl_count = mix_session_projections.reweighed_bowl_count +
      CASE WHEN NEW.event_type = 'reweigh_captured' THEN 1 ELSE 0 END,
    total_line_items = mix_session_projections.total_line_items +
      CASE WHEN NEW.event_type = 'line_item_recorded' THEN 1
           WHEN NEW.event_type = 'line_item_removed' THEN -1
           ELSE 0 END,
    running_dispensed_weight = mix_session_projections.running_dispensed_weight +
      CASE WHEN NEW.event_type = 'line_item_recorded'
           THEN COALESCE((NEW.event_payload->>'quantity')::NUMERIC, 0)
           WHEN NEW.event_type = 'line_item_removed'
           THEN -COALESCE((NEW.event_payload->>'quantity')::NUMERIC, 0)
           ELSE 0 END,
    running_estimated_cost = mix_session_projections.running_estimated_cost +
      CASE WHEN NEW.event_type = 'line_item_recorded'
           THEN COALESCE((NEW.event_payload->>'cost')::NUMERIC, 0)
           WHEN NEW.event_type = 'line_item_removed'
           THEN -COALESCE((NEW.event_payload->>'cost')::NUMERIC, 0)
           ELSE 0 END,
    has_manual_override = mix_session_projections.has_manual_override
      OR NEW.event_type = 'manual_override_used',
    has_device_disconnect = mix_session_projections.has_device_disconnect
      OR NEW.event_type = 'device_disconnected',
    awaiting_reweigh_count = mix_session_projections.awaiting_reweigh_count +
      CASE WHEN NEW.event_type = 'bowl_sealed' THEN 1
           WHEN NEW.event_type = 'reweigh_captured' THEN -1
           ELSE 0 END,
    unresolved_flag = mix_session_projections.unresolved_flag
      OR NEW.event_type = 'session_marked_unresolved';

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mix_session_projection_on_event
  AFTER INSERT ON public.mix_session_events
  FOR EACH ROW EXECUTE FUNCTION public.update_mix_session_projection_on_event();
