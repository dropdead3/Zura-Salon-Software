
-- =========================================================================
-- 1. Helper: user_has_location_access
--    Returns TRUE when:
--      - user is super_admin OR account owner, OR
--      - user has the 'view_all_locations_analytics' permission, OR
--      - the location is in the user's assigned location_ids[] / legacy location_id.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.user_has_location_access(_user_id uuid, _location_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super boolean;
  v_owner boolean;
  v_perm boolean;
  v_assigned text[];
  v_legacy text;
BEGIN
  -- NULL location = company-wide; everyone in the org is allowed.
  IF _location_id IS NULL THEN
    RETURN TRUE;
  END IF;

  SELECT
    COALESCE(ep.is_super_admin, FALSE),
    COALESCE(ep.is_primary_owner, FALSE),
    ep.location_ids,
    ep.location_id
  INTO v_super, v_owner, v_assigned, v_legacy
  FROM public.employee_profiles ep
  WHERE ep.user_id = _user_id
  LIMIT 1;

  IF v_super OR v_owner THEN
    RETURN TRUE;
  END IF;

  -- Cross-location analytics permission grants visibility into all locations.
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = _user_id
      AND up.permission = 'view_all_locations_analytics'
  ) INTO v_perm;

  IF v_perm THEN
    RETURN TRUE;
  END IF;

  IF v_assigned IS NOT NULL AND _location_id = ANY(v_assigned) THEN
    RETURN TRUE;
  END IF;

  IF v_legacy IS NOT NULL AND v_legacy = _location_id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- =========================================================================
-- 2. Add organization_id to announcements (nullable for backfill, then NOT NULL).
-- =========================================================================
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill from the author's employee_profile.
UPDATE public.announcements a
SET organization_id = ep.organization_id
FROM public.employee_profiles ep
WHERE a.organization_id IS NULL
  AND ep.user_id = a.author_id
  AND ep.organization_id IS NOT NULL;

-- Drop any rows that still couldn't be tied to an org (orphaned authors).
DELETE FROM public.announcements WHERE organization_id IS NULL;

ALTER TABLE public.announcements
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_announcements_org_active
  ON public.announcements (organization_id, is_active);

-- =========================================================================
-- 3. Replace permissive policies with org+location-scoped policies.
-- =========================================================================
DROP POLICY IF EXISTS "All staff can view active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can view all announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can create announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;

-- Staff: active, non-expired, in their org, and either company-wide or
-- scoped to a location they have access to.
CREATE POLICY "staff_view_org_scoped_announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND (expires_at IS NULL OR expires_at > now())
    AND public.is_org_member(auth.uid(), organization_id)
    AND public.user_has_location_access(auth.uid(), location_id)
  );

-- Admins/coaches: full visibility within their own org (including drafts/expired).
CREATE POLICY "admins_view_all_org_announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    public.is_coach_or_admin(auth.uid())
    AND public.is_org_member(auth.uid(), organization_id)
  );

-- Admins create within their own org only.
CREATE POLICY "admins_create_org_announcements"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_coach_or_admin(auth.uid())
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "admins_update_org_announcements"
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (
    public.is_coach_or_admin(auth.uid())
    AND public.is_org_member(auth.uid(), organization_id)
  )
  WITH CHECK (
    public.is_coach_or_admin(auth.uid())
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "admins_delete_org_announcements"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    public.is_coach_or_admin(auth.uid())
    AND public.is_org_member(auth.uid(), organization_id)
  );
