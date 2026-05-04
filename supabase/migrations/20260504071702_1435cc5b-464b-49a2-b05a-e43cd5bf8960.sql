CREATE OR REPLACE FUNCTION public.reorder_menu_items(
  p_menu_id uuid,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_item jsonb;
  v_id uuid;
  v_sort_order int;
  v_parent_id uuid;
BEGIN
  -- Resolve menu's org and authorize caller
  SELECT organization_id INTO v_org_id
  FROM public.website_menus
  WHERE id = p_menu_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'menu not found';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Apply each update; verify each item belongs to this menu
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_id := (v_item->>'id')::uuid;
    v_sort_order := (v_item->>'sort_order')::int;
    v_parent_id := NULLIF(v_item->>'parent_id', '')::uuid;

    -- Enforce max depth = 2: parent (if any) must be a root item
    IF v_parent_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.website_menu_items
        WHERE id = v_parent_id
          AND menu_id = p_menu_id
          AND parent_id IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'max depth exceeded for item %', v_id;
      END IF;
    END IF;

    UPDATE public.website_menu_items
    SET sort_order = v_sort_order,
        parent_id = v_parent_id,
        updated_at = now()
    WHERE id = v_id
      AND menu_id = p_menu_id
      AND organization_id = v_org_id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_menu_items(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_menu_items(uuid, jsonb) TO authenticated;