-- Wave 28.x — fix wizard-adopted policies spinning forever in configurator.
-- Two changes:
--   1) Rewrite adopt_policies_from_library to also create a draft policy_versions
--      row when none exists (mirrors adopt_and_init_policy).
--   2) One-time backfill: insert a draft version for every adopted policy that
--      currently has no open (effective_to IS NULL) version.

CREATE OR REPLACE FUNCTION public.adopt_policies_from_library(
  p_organization_id uuid,
  p_library_keys text[]
)
RETURNS TABLE(policy_id uuid, library_key text, was_created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lib_row RECORD;
  existing_id uuid;
  new_id uuid;
  v_version_id uuid;
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
    END IF;

    -- Ensure a draft version exists (idempotent — mirrors adopt_and_init_policy)
    SELECT id INTO v_version_id
    FROM public.policy_versions
    WHERE policy_versions.policy_id = adopt_policies_from_library.policy_id
      AND effective_to IS NULL
    LIMIT 1;

    IF v_version_id IS NULL THEN
      INSERT INTO public.policy_versions (
        policy_id, organization_id, version_number, effective_from, changelog_summary, created_by
      )
      VALUES (
        adopt_policies_from_library.policy_id, p_organization_id, 1, now(), 'Initial draft', auth.uid()
      )
      RETURNING id INTO v_version_id;

      UPDATE public.policies
      SET current_version_id = v_version_id
      WHERE id = adopt_policies_from_library.policy_id;
    END IF;

    RETURN NEXT;
  END LOOP;
END;
$function$;

-- One-time backfill: for every adopted policy with no open version, insert a v1 draft.
-- Uses MAX(version_number)+1 (defaulting to 1) so historic policies with closed versions get a fresh draft.
WITH orphaned AS (
  SELECT
    p.id          AS policy_id,
    p.organization_id,
    COALESCE(MAX(v.version_number), 0) + 1 AS next_version
  FROM public.policies p
  LEFT JOIN public.policy_versions v ON v.policy_id = p.id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.policy_versions v2
    WHERE v2.policy_id = p.id AND v2.effective_to IS NULL
  )
  GROUP BY p.id, p.organization_id
),
inserted AS (
  INSERT INTO public.policy_versions (
    policy_id, organization_id, version_number, effective_from, changelog_summary
  )
  SELECT policy_id, organization_id, next_version, now(), 'Initial draft (backfill)'
  FROM orphaned
  RETURNING id, policy_id
)
UPDATE public.policies p
SET current_version_id = i.id
FROM inserted i
WHERE p.id = i.policy_id
  AND p.current_version_id IS NULL;