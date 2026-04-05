
-- 1. location_groups
CREATE TABLE IF NOT EXISTS public.location_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

ALTER TABLE public.location_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view location groups"
  ON public.location_groups FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create location groups"
  ON public.location_groups FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update location groups"
  ON public.location_groups FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete location groups"
  ON public.location_groups FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_location_groups_org
  ON public.location_groups(organization_id);

CREATE TRIGGER update_location_groups_updated_at
  BEFORE UPDATE ON public.location_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add location_group_id to locations
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS location_group_id UUID REFERENCES public.location_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_locations_group
  ON public.locations(location_group_id) WHERE location_group_id IS NOT NULL;

-- 3. level_criteria_overrides
CREATE TABLE IF NOT EXISTS public.level_criteria_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stylist_level_id UUID NOT NULL REFERENCES public.stylist_levels(id) ON DELETE CASCADE,
  location_id TEXT,
  location_group_id UUID REFERENCES public.location_groups(id) ON DELETE CASCADE,
  criteria_type TEXT NOT NULL CHECK (criteria_type IN ('promotion', 'retention')),
  override_field TEXT NOT NULL,
  override_value NUMERIC NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_override_scope CHECK (
    (location_id IS NOT NULL AND location_group_id IS NULL)
    OR (location_id IS NULL AND location_group_id IS NOT NULL)
  ),
  UNIQUE (organization_id, stylist_level_id, location_id, location_group_id, criteria_type, override_field)
);

ALTER TABLE public.level_criteria_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view criteria overrides"
  ON public.level_criteria_overrides FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create criteria overrides"
  ON public.level_criteria_overrides FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update criteria overrides"
  ON public.level_criteria_overrides FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete criteria overrides"
  ON public.level_criteria_overrides FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_level_criteria_overrides_org_level
  ON public.level_criteria_overrides(organization_id, stylist_level_id);

CREATE TRIGGER update_level_criteria_overrides_updated_at
  BEFORE UPDATE ON public.level_criteria_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. level_commission_overrides
CREATE TABLE IF NOT EXISTS public.level_commission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stylist_level_id UUID NOT NULL REFERENCES public.stylist_levels(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  service_commission_rate NUMERIC,
  retail_commission_rate NUMERIC,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, stylist_level_id, location_id)
);

ALTER TABLE public.level_commission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view commission overrides"
  ON public.level_commission_overrides FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create commission overrides"
  ON public.level_commission_overrides FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update commission overrides"
  ON public.level_commission_overrides FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete commission overrides"
  ON public.level_commission_overrides FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_level_commission_overrides_org_level
  ON public.level_commission_overrides(organization_id, stylist_level_id);

CREATE TRIGGER update_level_commission_overrides_updated_at
  BEFORE UPDATE ON public.level_commission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
