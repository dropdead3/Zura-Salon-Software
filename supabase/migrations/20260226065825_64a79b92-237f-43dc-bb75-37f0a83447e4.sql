
-- Organization Goals table: replaces localStorage-based sales goals
-- Stores org-level targets for revenue, margin, client health, efficiency, staffing
CREATE TABLE IF NOT EXISTS public.organization_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  metric_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'revenue',
  target_value NUMERIC NOT NULL,
  warning_threshold NUMERIC,
  critical_threshold NUMERIC,
  goal_period TEXT NOT NULL DEFAULT 'monthly',
  unit TEXT NOT NULL DEFAULT '$',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, location_id, metric_key, goal_period)
);

-- Enable RLS
ALTER TABLE public.organization_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view goals"
  ON public.organization_goals FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create goals"
  ON public.organization_goals FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update goals"
  ON public.organization_goals FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete goals"
  ON public.organization_goals FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_organization_goals_updated_at
  BEFORE UPDATE ON public.organization_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX IF NOT EXISTS idx_organization_goals_org
  ON public.organization_goals(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_goals_category
  ON public.organization_goals(organization_id, category);
