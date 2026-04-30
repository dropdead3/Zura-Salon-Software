-- 1. FK cascade: don't block user deletion just because they last edited a draft.
ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_draft_updated_by_fkey;

ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_draft_updated_by_fkey
  FOREIGN KEY (draft_updated_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- 2. Atomic publish: promote every divergent draft → live in a single
--    transaction. SECURITY DEFINER + explicit org-admin check so a
--    half-failed network call never leaves the org partially published.
CREATE OR REPLACE FUNCTION public.publish_site_settings_drafts(_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promoted_count integer := 0;
BEGIN
  -- Authorization: only org admins (or platform users) may publish.
  IF NOT (
    public.is_org_admin(auth.uid(), _org_id)
    OR public.is_platform_user(auth.uid())
  ) THEN
    RAISE EXCEPTION 'not_authorized: publish requires org admin role'
      USING ERRCODE = '42501';
  END IF;

  -- One UPDATE, one transaction. Compares jsonb directly (order-insensitive)
  -- which fixes the JSON.stringify ordering bug on the client.
  UPDATE public.site_settings AS s
     SET value = s.draft_value
   WHERE s.organization_id = _org_id
     AND s.draft_value IS NOT NULL
     AND s.draft_value IS DISTINCT FROM s.value;

  GET DIAGNOSTICS promoted_count = ROW_COUNT;
  RETURN promoted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_site_settings_drafts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_site_settings_drafts(uuid) TO authenticated;

-- 3. Server-side dirty-draft listing using jsonb DISTINCT (order-insensitive).
--    Replaces client-side JSON.stringify diff so {a:1,b:2} == {b:2,a:1}.
CREATE OR REPLACE FUNCTION public.list_dirty_site_setting_drafts(_org_id uuid)
RETURNS TABLE(setting_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_org_member(auth.uid(), _org_id)
    OR public.is_platform_user(auth.uid())
  ) THEN
    RAISE EXCEPTION 'not_authorized'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT s.id
      FROM public.site_settings AS s
     WHERE s.organization_id = _org_id
       AND s.draft_value IS NOT NULL
       AND s.draft_value IS DISTINCT FROM s.value;
END;
$$;

REVOKE ALL ON FUNCTION public.list_dirty_site_setting_drafts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_dirty_site_setting_drafts(uuid) TO authenticated;

-- 4. Atomic discard: copy live value back into draft for every divergent row.
CREATE OR REPLACE FUNCTION public.discard_site_settings_drafts(_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reverted_count integer := 0;
BEGIN
  IF NOT (
    public.is_org_admin(auth.uid(), _org_id)
    OR public.is_platform_user(auth.uid())
  ) THEN
    RAISE EXCEPTION 'not_authorized'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.site_settings AS s
     SET draft_value = s.value,
         draft_updated_at = now()
   WHERE s.organization_id = _org_id
     AND s.draft_value IS DISTINCT FROM s.value;

  GET DIAGNOSTICS reverted_count = ROW_COUNT;
  RETURN reverted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.discard_site_settings_drafts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.discard_site_settings_drafts(uuid) TO authenticated;