-- Wave 9: Org-scope service_form_requirements RLS via parent services join.
-- Replaces permissive USING (true) SELECT and org-blind is_coach_or_admin writes.

DROP POLICY IF EXISTS "Anyone can read service form requirements" ON public.service_form_requirements;
DROP POLICY IF EXISTS "Admins can insert service form requirements" ON public.service_form_requirements;
DROP POLICY IF EXISTS "Admins can update service form requirements" ON public.service_form_requirements;
DROP POLICY IF EXISTS "Admins can delete service form requirements" ON public.service_form_requirements;

-- SELECT: org members of the parent service's org (or platform users)
CREATE POLICY "Org members can view service form requirements"
  ON public.service_form_requirements FOR SELECT
  USING (
    public.is_platform_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_form_requirements.service_id
        AND public.is_org_member(auth.uid(), s.organization_id)
    )
  );

-- INSERT: org admins of the parent service's org
CREATE POLICY "Org admins can insert service form requirements"
  ON public.service_form_requirements FOR INSERT
  WITH CHECK (
    public.is_platform_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_form_requirements.service_id
        AND public.is_org_admin(auth.uid(), s.organization_id)
    )
  );

-- UPDATE: org admins of the parent service's org (both old and new row)
CREATE POLICY "Org admins can update service form requirements"
  ON public.service_form_requirements FOR UPDATE
  USING (
    public.is_platform_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_form_requirements.service_id
        AND public.is_org_admin(auth.uid(), s.organization_id)
    )
  )
  WITH CHECK (
    public.is_platform_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_form_requirements.service_id
        AND public.is_org_admin(auth.uid(), s.organization_id)
    )
  );

-- DELETE: org admins of the parent service's org
CREATE POLICY "Org admins can delete service form requirements"
  ON public.service_form_requirements FOR DELETE
  USING (
    public.is_platform_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_form_requirements.service_id
        AND public.is_org_admin(auth.uid(), s.organization_id)
    )
  );