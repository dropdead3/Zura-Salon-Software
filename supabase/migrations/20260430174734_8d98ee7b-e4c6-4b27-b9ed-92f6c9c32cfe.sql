-- Atomic bulk menu publish: flip every unpublished menu item in the org
-- to is_published=true in a single transaction. SECURITY DEFINER + admin
-- check so a half-failed network call never leaves menus partially live.
CREATE OR REPLACE FUNCTION public.publish_all_menus(_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  published_count integer := 0;
BEGIN
  IF NOT (
    public.is_org_admin(auth.uid(), _org_id)
    OR public.is_platform_user(auth.uid())
  ) THEN
    RAISE EXCEPTION 'not_authorized: publishing menus requires org admin role'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.website_menu_items
     SET is_published = true,
         updated_at = now()
   WHERE organization_id = _org_id
     AND is_published = false;

  GET DIAGNOSTICS published_count = ROW_COUNT;
  RETURN published_count;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_all_menus(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_all_menus(uuid) TO authenticated;