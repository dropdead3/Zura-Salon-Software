-- Enum for event type
DO $$ BEGIN
  CREATE TYPE public.color_bar_suspension_event_type AS ENUM ('suspended', 'reactivated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Audit table
CREATE TABLE IF NOT EXISTS public.color_bar_suspension_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type public.color_bar_suspension_event_type NOT NULL,
  reason TEXT,
  notes TEXT,
  actor_user_id UUID REFERENCES auth.users(id),
  affected_location_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.color_bar_suspension_events ENABLE ROW LEVEL SECURITY;

-- Org admins read their own
CREATE POLICY "Org admins can view their suspension events"
  ON public.color_bar_suspension_events FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Platform users read all
CREATE POLICY "Platform users can view all suspension events"
  ON public.color_bar_suspension_events FOR SELECT
  USING (public.is_platform_user(auth.uid()));

-- Platform users can insert any
CREATE POLICY "Platform users can insert suspension events"
  ON public.color_bar_suspension_events FOR INSERT
  WITH CHECK (public.is_platform_user(auth.uid()));

-- Org admins can insert for their own org
CREATE POLICY "Org admins can insert suspension events for their org"
  ON public.color_bar_suspension_events FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cb_suspension_events_org
  ON public.color_bar_suspension_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cb_suspension_events_type
  ON public.color_bar_suspension_events(event_type, created_at DESC);