-- Wave 28.3 — Org Policy Setup profile + bulk-adopt RPC
-- Captures the business profile that drives smart recommendations in the Policy Library.

CREATE TABLE IF NOT EXISTS public.policy_org_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_type text,
  primary_state text,
  team_size_band text,
  offers_extensions boolean NOT NULL DEFAULT false,
  offers_retail boolean NOT NULL DEFAULT false,
  offers_packages boolean NOT NULL DEFAULT false,
  offers_memberships boolean NOT NULL DEFAULT false,
  serves_minors boolean NOT NULL DEFAULT false,
  has_existing_handbook boolean NOT NULL DEFAULT false,
  has_existing_client_policies boolean NOT NULL DEFAULT false,
  roles_used text[] NOT NULL DEFAULT '{}',
  service_categories text[] NOT NULL DEFAULT '{}',
  setup_completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_org_profile_org ON public.policy_org_profile(organization_id);

ALTER TABLE public.policy_org_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read policy profile"
  ON public.policy_org_profile FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert policy profile"
  ON public.policy_org_profile FOR INSERT
  TO authenticated
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update policy profile"
  ON public.policy_org_profile FOR UPDATE
  TO authenticated
  USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete policy profile"
  ON public.policy_org_profile FOR DELETE
  TO authenticated
  USING (is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_policy_org_profile_updated_at
  BEFORE UPDATE ON public.policy_org_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bulk-adopt RPC: insert policies rows for the given library_keys, idempotent.
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
    SELECT id INTO existing_id
    FROM public.policies
    WHERE organization_id = p_organization_id AND library_key = lib_row.key;

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