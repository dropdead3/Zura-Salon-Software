-- Stylist service-level exclusions
CREATE TABLE IF NOT EXISTS public.stylist_service_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (employee_id, service_id)
);

ALTER TABLE public.stylist_service_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view service exclusions"
  ON public.stylist_service_exclusions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert service exclusions"
  ON public.stylist_service_exclusions FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update service exclusions"
  ON public.stylist_service_exclusions FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete service exclusions"
  ON public.stylist_service_exclusions FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_stylist_service_exclusions_org
  ON public.stylist_service_exclusions(organization_id);
CREATE INDEX IF NOT EXISTS idx_stylist_service_exclusions_employee
  ON public.stylist_service_exclusions(employee_id);
CREATE INDEX IF NOT EXISTS idx_stylist_service_exclusions_service
  ON public.stylist_service_exclusions(service_id);

-- Stylist category-level exclusions
CREATE TABLE IF NOT EXISTS public.stylist_category_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (employee_id, category_name)
);

ALTER TABLE public.stylist_category_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view category exclusions"
  ON public.stylist_category_exclusions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert category exclusions"
  ON public.stylist_category_exclusions FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update category exclusions"
  ON public.stylist_category_exclusions FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete category exclusions"
  ON public.stylist_category_exclusions FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_stylist_category_exclusions_org
  ON public.stylist_category_exclusions(organization_id);
CREATE INDEX IF NOT EXISTS idx_stylist_category_exclusions_employee
  ON public.stylist_category_exclusions(employee_id);