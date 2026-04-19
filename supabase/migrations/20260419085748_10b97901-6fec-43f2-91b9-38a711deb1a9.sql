-- Wave 27.1.1 — Handbook role alignment + ack security hardening

-- ============================================================
-- Fix 1: Backfill section library default_roles to canonical app_role keys
-- ============================================================
UPDATE public.org_handbook_section_library
   SET default_roles = (
     SELECT jsonb_agg(
       CASE x::text
         WHEN '"front_desk"' THEN '"receptionist"'::jsonb
         WHEN '"director"'   THEN '"admin"'::jsonb
         WHEN '"apprentice"' THEN '"assistant"'::jsonb
         WHEN '"support"'    THEN '"inventory_manager"'::jsonb
         WHEN '"educator"'   THEN '"manager"'::jsonb
         ELSE x
       END
     )
     FROM jsonb_array_elements(default_roles) x
   )
 WHERE default_roles IS NOT NULL
   AND jsonb_array_length(default_roles) > 0;

-- Backfill org_handbooks.primary_role to canonical app_role keys
UPDATE public.org_handbooks
   SET primary_role = CASE primary_role
     WHEN 'front_desk' THEN 'receptionist'
     WHEN 'director'   THEN 'admin'
     WHEN 'apprentice' THEN 'assistant'
     WHEN 'support'    THEN 'inventory_manager'
     WHEN 'educator'   THEN 'manager'
     ELSE primary_role
   END
 WHERE primary_role IN ('front_desk','director','apprentice','support','educator');

-- Backfill org_handbook_org_setup.roles_enabled (jsonb array)
UPDATE public.org_handbook_org_setup
   SET roles_enabled = (
     SELECT jsonb_agg(
       CASE x::text
         WHEN '"front_desk"' THEN '"receptionist"'::jsonb
         WHEN '"director"'   THEN '"admin"'::jsonb
         WHEN '"apprentice"' THEN '"assistant"'::jsonb
         WHEN '"support"'    THEN '"inventory_manager"'::jsonb
         WHEN '"educator"'   THEN '"manager"'::jsonb
         ELSE x
       END
     )
     FROM jsonb_array_elements(roles_enabled) x
   )
 WHERE roles_enabled IS NOT NULL
   AND jsonb_array_length(roles_enabled) > 0;

-- Backfill org_handbook_sections.applies_to->roles
UPDATE public.org_handbook_sections
   SET applies_to = jsonb_set(
     applies_to,
     '{roles}',
     (
       SELECT jsonb_agg(
         CASE x::text
           WHEN '"front_desk"' THEN '"receptionist"'::jsonb
           WHEN '"director"'   THEN '"admin"'::jsonb
           WHEN '"apprentice"' THEN '"assistant"'::jsonb
           WHEN '"support"'    THEN '"inventory_manager"'::jsonb
           WHEN '"educator"'   THEN '"manager"'::jsonb
           ELSE x
         END
       )
       FROM jsonb_array_elements(applies_to->'roles') x
     )
   )
 WHERE applies_to ? 'roles'
   AND jsonb_array_length(applies_to->'roles') > 0;

-- ============================================================
-- Fix 3: Add organization_id to handbook_acknowledgments + tighten RLS
-- ============================================================
ALTER TABLE public.handbook_acknowledgments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill via the user's primary active employee_profile
UPDATE public.handbook_acknowledgments ha
   SET organization_id = ep.organization_id
  FROM public.employee_profiles ep
 WHERE ha.user_id = ep.user_id
   AND ha.organization_id IS NULL
   AND ep.is_active = true;

CREATE INDEX IF NOT EXISTS idx_handbook_acks_org
  ON public.handbook_acknowledgments(organization_id);

-- Replace overpermissive coach-wide SELECT policy with org-scoped policy
DROP POLICY IF EXISTS "Coaches can view all acknowledgments"
  ON public.handbook_acknowledgments;

CREATE POLICY "Org leadership can view org acknowledgments"
  ON public.handbook_acknowledgments
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND public.is_org_admin(auth.uid(), organization_id)
  );

-- Tighten INSERT to require org match
DROP POLICY IF EXISTS "Users can acknowledge handbooks"
  ON public.handbook_acknowledgments;

CREATE POLICY "Users can acknowledge own handbooks in their org"
  ON public.handbook_acknowledgments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      organization_id IS NULL  -- legacy fallback during transition
      OR public.is_org_member(auth.uid(), organization_id)
    )
  );