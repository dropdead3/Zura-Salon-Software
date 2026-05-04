-- Atomic publish_menu RPC: wraps version-snapshot + bump in a single transaction
-- with SELECT ... FOR UPDATE on the menu row to serialize concurrent publishers.
-- Also adds a UNIQUE constraint as belt-and-suspenders against any future caller
-- that doesn't go through the RPC.

ALTER TABLE public.website_menu_versions
  ADD CONSTRAINT website_menu_versions_menu_version_unique
  UNIQUE (menu_id, version_number);

CREATE OR REPLACE FUNCTION public.publish_menu(
  p_menu_id uuid,
  p_change_summary text DEFAULT NULL
) RETURNS TABLE (version_number integer, items_published integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_next_version integer;
  v_snapshot jsonb;
  v_items_published integer;
  v_user_id uuid := auth.uid();
BEGIN
  -- Lock the menu row to serialize concurrent publishers for the same menu.
  SELECT organization_id
    INTO v_org_id
    FROM public.website_menus
   WHERE id = p_menu_id
   FOR UPDATE;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Menu % not found', p_menu_id USING ERRCODE = 'P0002';
  END IF;

  -- AuthZ: only org admins can publish.
  IF NOT public.is_org_admin(_user_id := v_user_id, _org_id := v_org_id) THEN
    RAISE EXCEPTION 'Not authorized to publish menus for this organization'
      USING ERRCODE = '42501';
  END IF;

  -- Compute next version under the row lock — no race possible.
  SELECT COALESCE(MAX(v.version_number), 0) + 1
    INTO v_next_version
    FROM public.website_menu_versions v
   WHERE v.menu_id = p_menu_id;

  -- Capture snapshot of all items as JSON.
  SELECT COALESCE(jsonb_agg(to_jsonb(i.*) ORDER BY i.sort_order), '[]'::jsonb)
    INTO v_snapshot
    FROM public.website_menu_items i
   WHERE i.menu_id = p_menu_id;

  INSERT INTO public.website_menu_versions
    (menu_id, organization_id, version_number, snapshot, published_by, change_summary)
  VALUES
    (p_menu_id, v_org_id, v_next_version, v_snapshot, v_user_id, p_change_summary);

  -- Mark all items as published.
  UPDATE public.website_menu_items
     SET is_published = true
   WHERE menu_id = p_menu_id
     AND is_published = false;

  GET DIAGNOSTICS v_items_published = ROW_COUNT;

  RETURN QUERY SELECT v_next_version, v_items_published;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_menu(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.publish_menu(uuid, text) TO authenticated;