
-- 1. Add organization_id column (nullable first for backfill)
ALTER TABLE public.stylist_levels
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Backfill existing rows with the single existing org
UPDATE public.stylist_levels
SET organization_id = 'fa23cd95-decf-436a-adba-4561b0ecc14d'
WHERE organization_id IS NULL;

-- 3. Make NOT NULL
ALTER TABLE public.stylist_levels
  ALTER COLUMN organization_id SET NOT NULL;

-- 4. Drop old unique constraint on slug, add composite
ALTER TABLE public.stylist_levels
  DROP CONSTRAINT IF EXISTS stylist_levels_slug_key;

ALTER TABLE public.stylist_levels
  ADD CONSTRAINT stylist_levels_org_slug_key UNIQUE (organization_id, slug);

-- 5. Add index for org-scoped queries
CREATE INDEX IF NOT EXISTS idx_stylist_levels_org
  ON public.stylist_levels(organization_id);

-- 6. Drop old RLS policies
DROP POLICY IF EXISTS "Anyone authenticated can view levels" ON public.stylist_levels;
DROP POLICY IF EXISTS "Admins can manage levels" ON public.stylist_levels;

-- 7. Create org-scoped RLS policies
CREATE POLICY "Org members can view levels"
  ON public.stylist_levels FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create levels"
  ON public.stylist_levels FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update levels"
  ON public.stylist_levels FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete levels"
  ON public.stylist_levels FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));
