CREATE OR REPLACE FUNCTION public.adopt_policies_from_library(
  p_organization_id uuid,
  p_library_keys text[]
)
RETURNS TABLE(policy_id uuid, library_key text, was_created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lib_row RECORD;
  existing_id uuid;
  new_id uuid;
BEGIN
  -- Authorization: only org admins
  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Not authorized to adopt policies for this organization';
  END IF;

  FOR lib_row IN
    SELECT key, category, audience, title, default_owner_role
    FROM public.policy_library
    WHERE key = ANY(p_library_keys)
  LOOP
    SELECT p.id INTO existing_id
    FROM public.policies p
    WHERE p.organization_id = p_organization_id
      AND p.library_key = lib_row.key;

    IF existing_id IS NOT NULL THEN
      policy_id := existing_id;
      library_key := lib_row.key;
      was_created := false;
      RETURN NEXT;
    ELSE
      INSERT INTO public.policies (
        organization_id, library_key, category, audience,
        internal_title, status, primary_owner_role, created_by
      ) VALUES (
        p_organization_id, lib_row.key, lib_row.category, lib_row.audience,
        lib_row.title, 'drafting'::policy_status, lib_row.default_owner_role, auth.uid()
      )
      RETURNING id INTO new_id;

      policy_id := new_id;
      library_key := lib_row.key;
      was_created := true;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.adopt_policies_from_library(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adopt_policies_from_library(uuid, text[]) TO authenticated;