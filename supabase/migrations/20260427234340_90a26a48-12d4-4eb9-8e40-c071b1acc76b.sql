-- Org Calendar Events — operator-curated 14-day-window events
CREATE TABLE IF NOT EXISTS public.org_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id text REFERENCES public.locations(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'other',
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_calendar_events_kind_check CHECK (
    kind IN ('training','vendor','milestone','off_site','holiday','other')
  ),
  CONSTRAINT org_calendar_events_time_order_check CHECK (
    end_at IS NULL OR end_at >= start_at
  )
);

CREATE INDEX IF NOT EXISTS idx_org_calendar_events_org_start
  ON public.org_calendar_events (organization_id, start_at);

ALTER TABLE public.org_calendar_events ENABLE ROW LEVEL SECURITY;

-- View: any org member
CREATE POLICY "Org members can view calendar events"
  ON public.org_calendar_events
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Manage: org admins/managers (write authorization)
CREATE POLICY "Org admins can manage calendar events"
  ON public.org_calendar_events
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Platform bypass
CREATE POLICY "Platform users have full access to calendar events"
  ON public.org_calendar_events
  FOR ALL
  TO authenticated
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));

-- updated_at trigger
CREATE TRIGGER update_org_calendar_events_updated_at
  BEFORE UPDATE ON public.org_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();