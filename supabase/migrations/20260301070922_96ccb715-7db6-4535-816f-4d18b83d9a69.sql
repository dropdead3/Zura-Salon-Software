
-- Step 1: Add organization_id column (nullable initially)
ALTER TABLE public.site_settings
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Step 2: Backfill all existing rows to the single existing org
UPDATE public.site_settings
  SET organization_id = 'fa23cd95-decf-436a-adba-4561b0ecc14d'
  WHERE organization_id IS NULL
    AND id != 'platform_branding';

-- Step 3: Drop the old primary key on id
ALTER TABLE public.site_settings DROP CONSTRAINT site_settings_pkey;

-- Step 4: Create composite primary key (organization_id, id)
-- Platform branding has NULL org_id, so we need a unique constraint approach instead
-- Make organization_id NOT NULL for org-scoped rows, but platform_branding stays NULL
-- Use a unique index instead of a PK to allow nullable org_id for platform rows
CREATE UNIQUE INDEX site_settings_org_id_key ON public.site_settings (organization_id, id) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX site_settings_platform_key ON public.site_settings (id) WHERE organization_id IS NULL;

-- Step 5: Add index on organization_id for performance
CREATE INDEX idx_site_settings_organization_id ON public.site_settings (organization_id);

-- Step 6: Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can read site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can insert site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can update site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Platform owners can update platform branding" ON public.site_settings;

-- Step 7: Create new org-scoped RLS policies

-- SELECT: Org members can read their org's settings
CREATE POLICY "Org members can read own settings"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)
  );

-- SELECT: Platform users can read platform-scoped settings (org_id IS NULL)
CREATE POLICY "Platform users can read platform settings"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL AND is_platform_user(auth.uid())
  );

-- SELECT: Anonymous users can read settings for active organizations (public website)
CREATE POLICY "Anon can read active org settings"
  ON public.site_settings
  FOR SELECT
  TO anon
  USING (
    organization_id IS NOT NULL
    AND organization_id IN (SELECT id FROM public.organizations WHERE status = 'active')
  );

-- INSERT: Org admins can insert settings for their org
CREATE POLICY "Org admins can insert settings"
  ON public.site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id)
  );

-- UPDATE: Org admins can update settings for their org
CREATE POLICY "Org admins can update settings"
  ON public.site_settings
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id)
  )
  WITH CHECK (
    organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id)
  );

-- UPDATE: Platform owners can update platform branding
CREATE POLICY "Platform owners can update platform branding"
  ON public.site_settings
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NULL AND has_platform_role(auth.uid(), 'platform_owner')
  )
  WITH CHECK (
    organization_id IS NULL AND has_platform_role(auth.uid(), 'platform_owner')
  );

-- DELETE: Org admins can delete settings for their org
CREATE POLICY "Org admins can delete settings"
  ON public.site_settings
  FOR DELETE
  TO authenticated
  USING (
    organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id)
  );
