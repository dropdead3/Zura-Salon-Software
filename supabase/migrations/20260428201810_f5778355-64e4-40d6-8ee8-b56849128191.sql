-- Wave 2: Tenant-scope dashboard_element_visibility
-- NULL organization_id = global role-default (platform-seeded baseline).
-- Non-NULL = per-organization override.

ALTER TABLE public.dashboard_element_visibility
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Replace single-tenant unique constraint with org-aware uniqueness.
-- NULLs are not equal in unique constraints, so we use two partial indexes
-- to enforce uniqueness for both the global baseline and per-org overrides.
ALTER TABLE public.dashboard_element_visibility
  DROP CONSTRAINT IF EXISTS dashboard_element_visibility_element_key_role_key;

CREATE UNIQUE INDEX IF NOT EXISTS dashboard_element_visibility_global_uniq
  ON public.dashboard_element_visibility (element_key, role)
  WHERE organization_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS dashboard_element_visibility_org_uniq
  ON public.dashboard_element_visibility (element_key, role, organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS dashboard_element_visibility_org_idx
  ON public.dashboard_element_visibility (organization_id)
  WHERE organization_id IS NOT NULL;

-- Replace RLS: tenant-scoped reads + writes.
DROP POLICY IF EXISTS "Anyone can view dashboard visibility settings" ON public.dashboard_element_visibility;
DROP POLICY IF EXISTS "Leadership can manage visibility settings" ON public.dashboard_element_visibility;
DROP POLICY IF EXISTS "Super admins can manage visibility settings" ON public.dashboard_element_visibility;

-- SELECT: see global defaults (org=NULL) + your own org's overrides.
CREATE POLICY "View global defaults and own org visibility"
ON public.dashboard_element_visibility
FOR SELECT
TO authenticated
USING (
  organization_id IS NULL
  OR public.is_org_member(auth.uid(), organization_id)
  OR public.is_platform_user(auth.uid())
);

-- INSERT: platform users may seed global defaults; org admins/managers/super_admin
-- may insert per-org overrides scoped to their org.
CREATE POLICY "Insert visibility settings"
ON public.dashboard_element_visibility
FOR INSERT
TO authenticated
WITH CHECK (
  (organization_id IS NULL AND public.is_platform_user(auth.uid()))
  OR (
    organization_id IS NOT NULL
    AND (
      public.is_org_admin(auth.uid(), organization_id)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR public.is_platform_user(auth.uid())
    )
  )
);

-- UPDATE: same scoping rules as insert.
CREATE POLICY "Update visibility settings"
ON public.dashboard_element_visibility
FOR UPDATE
TO authenticated
USING (
  (organization_id IS NULL AND public.is_platform_user(auth.uid()))
  OR (
    organization_id IS NOT NULL
    AND (
      public.is_org_admin(auth.uid(), organization_id)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR public.is_platform_user(auth.uid())
    )
  )
)
WITH CHECK (
  (organization_id IS NULL AND public.is_platform_user(auth.uid()))
  OR (
    organization_id IS NOT NULL
    AND (
      public.is_org_admin(auth.uid(), organization_id)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR public.is_platform_user(auth.uid())
    )
  )
);

-- DELETE: same scoping rules.
CREATE POLICY "Delete visibility settings"
ON public.dashboard_element_visibility
FOR DELETE
TO authenticated
USING (
  (organization_id IS NULL AND public.is_platform_user(auth.uid()))
  OR (
    organization_id IS NOT NULL
    AND (
      public.is_org_admin(auth.uid(), organization_id)
      OR public.is_platform_user(auth.uid())
    )
  )
);
