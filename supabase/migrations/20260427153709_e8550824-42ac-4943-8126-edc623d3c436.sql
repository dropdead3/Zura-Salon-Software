-- Create role-keyed dashboard layout table
CREATE TABLE IF NOT EXISTS public.dashboard_role_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, role)
);

-- Enable RLS
ALTER TABLE public.dashboard_role_layouts ENABLE ROW LEVEL SECURITY;

-- Helper: is this user the primary owner of this organization?
CREATE OR REPLACE FUNCTION public.is_org_primary_owner(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_profiles ep
    WHERE ep.user_id = _user_id
      AND ep.organization_id = _org_id
      AND COALESCE(ep.is_primary_owner, false) = true
  );
$$;

-- Read: any org member
CREATE POLICY "Org members can read role layouts"
  ON public.dashboard_role_layouts
  FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- Write: account owner or platform user
CREATE POLICY "Owners can insert role layouts"
  ON public.dashboard_role_layouts
  FOR INSERT
  WITH CHECK (
    public.is_org_primary_owner(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

CREATE POLICY "Owners can update role layouts"
  ON public.dashboard_role_layouts
  FOR UPDATE
  USING (
    public.is_org_primary_owner(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  )
  WITH CHECK (
    public.is_org_primary_owner(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

CREATE POLICY "Owners can delete role layouts"
  ON public.dashboard_role_layouts
  FOR DELETE
  USING (
    public.is_org_primary_owner(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

-- Updated_at trigger
CREATE TRIGGER update_dashboard_role_layouts_updated_at
  BEFORE UPDATE ON public.dashboard_role_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_role_layouts_org
  ON public.dashboard_role_layouts(organization_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_role_layouts_org_role
  ON public.dashboard_role_layouts(organization_id, role);