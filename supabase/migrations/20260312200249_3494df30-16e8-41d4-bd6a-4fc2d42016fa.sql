
-- Create service_blueprints table
CREATE TABLE IF NOT EXISTS public.service_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  step_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, service_id, position)
);

-- Enable RLS
ALTER TABLE public.service_blueprints ENABLE ROW LEVEL SECURITY;

-- RLS: org members can view
CREATE POLICY "Org members can view blueprints"
  ON public.service_blueprints FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- RLS: org admins can create
CREATE POLICY "Org admins can create blueprints"
  ON public.service_blueprints FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- RLS: org admins can update
CREATE POLICY "Org admins can update blueprints"
  ON public.service_blueprints FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- RLS: org admins can delete
CREATE POLICY "Org admins can delete blueprints"
  ON public.service_blueprints FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_service_blueprints_updated_at
  BEFORE UPDATE ON public.service_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_blueprints_org ON public.service_blueprints(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_blueprints_service ON public.service_blueprints(service_id);
CREATE INDEX IF NOT EXISTS idx_service_blueprints_ordering ON public.service_blueprints(organization_id, service_id, position);
