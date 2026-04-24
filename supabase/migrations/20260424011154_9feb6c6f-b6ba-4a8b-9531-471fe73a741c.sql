
-- Theme Governance: lock brand theme writes to Account Owners only.
-- These three site_settings keys store organization-wide brand identity
-- (color preset + custom hex tokens + custom typography). Per the
-- Theme Governance canon, only the Account Owner (is_primary_owner)
-- may mutate them; all org members may read them.

-- 1) Helper: is the current user the primary owner of this organization?
CREATE OR REPLACE FUNCTION public.is_org_primary_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_profiles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND COALESCE(is_primary_owner, false) = true
  );
$$;

-- 2) Replace existing broad org-admin write policies with policies that
--    exclude the three brand theme keys, then add primary-owner-only
--    policies for those keys. Reads stay open to org members (existing
--    "Org members can read own settings" policy already covers that).

DROP POLICY IF EXISTS "Org admins can insert settings" ON public.site_settings;
DROP POLICY IF EXISTS "Org admins can update settings" ON public.site_settings;
DROP POLICY IF EXISTS "Org admins can delete settings" ON public.site_settings;

-- Org admins: write all NON-theme settings
CREATE POLICY "Org admins can insert non-theme settings"
ON public.site_settings
FOR INSERT
WITH CHECK (
  organization_id IS NOT NULL
  AND public.is_org_admin(auth.uid(), organization_id)
  AND id NOT IN ('org_color_theme', 'org_custom_theme', 'org_custom_typography')
);

CREATE POLICY "Org admins can update non-theme settings"
ON public.site_settings
FOR UPDATE
USING (
  organization_id IS NOT NULL
  AND public.is_org_admin(auth.uid(), organization_id)
  AND id NOT IN ('org_color_theme', 'org_custom_theme', 'org_custom_typography')
)
WITH CHECK (
  organization_id IS NOT NULL
  AND public.is_org_admin(auth.uid(), organization_id)
  AND id NOT IN ('org_color_theme', 'org_custom_theme', 'org_custom_typography')
);

CREATE POLICY "Org admins can delete non-theme settings"
ON public.site_settings
FOR DELETE
USING (
  organization_id IS NOT NULL
  AND public.is_org_admin(auth.uid(), organization_id)
  AND id NOT IN ('org_color_theme', 'org_custom_theme', 'org_custom_typography')
);

-- Account owners only: write the three brand theme settings
CREATE POLICY "Owners can insert theme settings"
ON public.site_settings
FOR INSERT
WITH CHECK (
  organization_id IS NOT NULL
  AND id IN ('org_color_theme', 'org_custom_theme', 'org_custom_typography')
  AND public.is_org_primary_owner(auth.uid(), organization_id)
);

CREATE POLICY "Owners can update theme settings"
ON public.site_settings
FOR UPDATE
USING (
  organization_id IS NOT NULL
  AND id IN ('org_color_theme', 'org_custom_theme', 'org_custom_typography')
  AND public.is_org_primary_owner(auth.uid(), organization_id)
)
WITH CHECK (
  organization_id IS NOT NULL
  AND id IN ('org_color_theme', 'org_custom_theme', 'org_custom_typography')
  AND public.is_org_primary_owner(auth.uid(), organization_id)
);

CREATE POLICY "Owners can delete theme settings"
ON public.site_settings
FOR DELETE
USING (
  organization_id IS NOT NULL
  AND id IN ('org_color_theme', 'org_custom_theme', 'org_custom_typography')
  AND public.is_org_primary_owner(auth.uid(), organization_id)
);
