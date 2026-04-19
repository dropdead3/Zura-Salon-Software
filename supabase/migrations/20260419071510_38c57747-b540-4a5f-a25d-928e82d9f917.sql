-- Drop existing SELECT and UPDATE policies that contain the organization_id IS NULL bypass
DROP POLICY IF EXISTS "Members can view service_category_colors" ON public.service_category_colors;
DROP POLICY IF EXISTS "Org admins can update service_category_colors" ON public.service_category_colors;
DROP POLICY IF EXISTS "service_category_colors_select" ON public.service_category_colors;
DROP POLICY IF EXISTS "service_category_colors_update" ON public.service_category_colors;
DROP POLICY IF EXISTS "Org members can view category colors" ON public.service_category_colors;
DROP POLICY IF EXISTS "Org admins can update category colors" ON public.service_category_colors;

-- Recreate without the NULL-org bypass branch
CREATE POLICY "Org members can view category colors"
ON public.service_category_colors
FOR SELECT
TO authenticated
USING (
  public.is_org_member(auth.uid(), organization_id)
  OR public.is_platform_user(auth.uid())
);

CREATE POLICY "Org admins can update category colors"
ON public.service_category_colors
FOR UPDATE
TO authenticated
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_user(auth.uid())
)
WITH CHECK (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_user(auth.uid())
);