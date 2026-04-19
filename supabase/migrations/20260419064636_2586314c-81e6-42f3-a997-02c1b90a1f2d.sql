-- Wave 8: P0 RLS hardening + P1 hotkey uniqueness

-- =========================================================================
-- P0 #1: services table — replace permissive RLS with org-scoped policies
-- =========================================================================
DROP POLICY IF EXISTS "Authenticated users can view services" ON public.services;
DROP POLICY IF EXISTS "Admin roles can manage services" ON public.services;

-- Org members can read their own org's services; platform users bypass
CREATE POLICY "Org members can view services"
  ON public.services FOR SELECT
  USING (
    public.is_org_member(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

-- Org admins can write within their org; platform users bypass
CREATE POLICY "Org admins can insert services"
  ON public.services FOR INSERT
  WITH CHECK (
    public.is_org_admin(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

CREATE POLICY "Org admins can update services"
  ON public.services FOR UPDATE
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  )
  WITH CHECK (
    public.is_org_admin(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

CREATE POLICY "Org admins can delete services"
  ON public.services FOR DELETE
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

-- =========================================================================
-- P0 #2: service_category_colors — replace blanket SELECT with org-scoped
-- =========================================================================
DROP POLICY IF EXISTS "Authenticated users can view service colors" ON public.service_category_colors;
DROP POLICY IF EXISTS "Org admins can manage service colors" ON public.service_category_colors;

-- Org members read; legacy NULL-org rows remain readable to all authenticated
-- users so the existing seed/global-defaults row keeps working.
CREATE POLICY "Org members can view service colors"
  ON public.service_category_colors FOR SELECT
  USING (
    organization_id IS NULL
    OR public.is_org_member(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

CREATE POLICY "Org admins can insert service colors"
  ON public.service_category_colors FOR INSERT
  WITH CHECK (
    public.is_org_admin(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

CREATE POLICY "Org admins can update service colors"
  ON public.service_category_colors FOR UPDATE
  USING (
    organization_id IS NULL
    OR public.is_org_admin(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  )
  WITH CHECK (
    organization_id IS NULL
    OR public.is_org_admin(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

CREATE POLICY "Org admins can delete service colors"
  ON public.service_category_colors FOR DELETE
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

-- =========================================================================
-- P1: pos_hotkey uniqueness per org (case-insensitive, ignores NULL/blank)
-- =========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_pos_hotkey_unique_per_org
  ON public.services (organization_id, UPPER(pos_hotkey))
  WHERE pos_hotkey IS NOT NULL AND pos_hotkey <> '';