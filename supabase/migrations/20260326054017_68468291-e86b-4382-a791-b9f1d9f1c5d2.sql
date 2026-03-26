
-- Bowl grouping table for recipe-based allowance calculator
CREATE TABLE IF NOT EXISTS public.service_allowance_bowls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  bowl_number INT NOT NULL DEFAULT 1,
  label TEXT NOT NULL DEFAULT 'Bowl 1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_allowance_bowls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view bowls"
  ON public.service_allowance_bowls FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create bowls"
  ON public.service_allowance_bowls FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update bowls"
  ON public.service_allowance_bowls FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete bowls"
  ON public.service_allowance_bowls FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_service_allowance_bowls_updated_at
  BEFORE UPDATE ON public.service_allowance_bowls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_service_allowance_bowls_org
  ON public.service_allowance_bowls(organization_id);

CREATE INDEX IF NOT EXISTS idx_service_allowance_bowls_service
  ON public.service_allowance_bowls(service_id);

-- Add bowl_id and cost snapshot to recipe baselines
ALTER TABLE public.service_recipe_baselines
  ADD COLUMN IF NOT EXISTS bowl_id UUID REFERENCES public.service_allowance_bowls(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_per_unit_snapshot NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_developer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS developer_ratio NUMERIC DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_service_recipe_baselines_bowl
  ON public.service_recipe_baselines(bowl_id);
