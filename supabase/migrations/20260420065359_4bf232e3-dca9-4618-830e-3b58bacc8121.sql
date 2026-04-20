-- Wave 1: Compensation plans foundation
-- Adds plan_type pluralism on top of existing stylist_levels (kept, not dropped).

-- Enum for plan types
DO $$ BEGIN
  CREATE TYPE public.compensation_plan_type AS ENUM (
    'level_based',
    'flat_commission',
    'sliding_period',
    'sliding_trailing',
    'hourly_vs_commission',
    'hourly_plus_commission',
    'team_pooled',
    'category_based',
    'booth_rental'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.commission_basis AS ENUM (
    'gross',
    'net_of_discount',
    'net_of_product_cost'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.tip_handling AS ENUM (
    'direct',
    'pooled',
    'withheld_for_payout'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.addon_treatment AS ENUM (
    'same_as_parent',
    'separate_rate',
    'no_commission'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Plans table
CREATE TABLE IF NOT EXISTS public.compensation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  plan_type public.compensation_plan_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  -- Plan-type-specific config (validated by Zod in app layer)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Universal modifiers
  commission_basis public.commission_basis NOT NULL DEFAULT 'gross',
  tip_handling public.tip_handling NOT NULL DEFAULT 'direct',
  refund_clawback BOOLEAN NOT NULL DEFAULT false,
  addon_treatment public.addon_treatment NOT NULL DEFAULT 'same_as_parent',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (organization_id, slug)
);

ALTER TABLE public.compensation_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view compensation plans"
  ON public.compensation_plans FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create compensation plans"
  ON public.compensation_plans FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update compensation plans"
  ON public.compensation_plans FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete compensation plans"
  ON public.compensation_plans FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_compensation_plans_updated_at
  BEFORE UPDATE ON public.compensation_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_compensation_plans_org
  ON public.compensation_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_compensation_plans_org_active
  ON public.compensation_plans(organization_id, is_active);

-- Assignments: which user is on which plan, effective-dated
CREATE TABLE IF NOT EXISTS public.user_compensation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.compensation_plans(id) ON DELETE RESTRICT,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.user_compensation_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view comp assignments"
  ON public.user_compensation_assignments FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create comp assignments"
  ON public.user_compensation_assignments FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update comp assignments"
  ON public.user_compensation_assignments FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete comp assignments"
  ON public.user_compensation_assignments FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_user_compensation_assignments_updated_at
  BEFORE UPDATE ON public.user_compensation_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_user_comp_assignments_org_user
  ON public.user_compensation_assignments(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_comp_assignments_plan
  ON public.user_compensation_assignments(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_comp_assignments_effective
  ON public.user_compensation_assignments(organization_id, user_id, effective_from DESC);

-- Backfill: every org with stylist_levels gets one auto-generated level_based plan.
-- Config carries the existing rate ladder. Existing employees get assignments by
-- their current stylist_level mapping.
INSERT INTO public.compensation_plans (
  organization_id, name, slug, plan_type, is_active, is_default,
  config, description
)
SELECT
  org.id,
  'Stylist Levels (Default)',
  'level-based-default',
  'level_based'::public.compensation_plan_type,
  true,
  true,
  jsonb_build_object(
    'levels',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'level_id', sl.id,
          'slug', sl.slug,
          'label', sl.label,
          'service_rate', sl.service_commission_rate,
          'retail_rate', sl.retail_commission_rate,
          'hourly_wage', sl.hourly_wage,
          'hourly_wage_enabled', sl.hourly_wage_enabled
        ) ORDER BY sl.display_order
      )
      FROM public.stylist_levels sl
      WHERE sl.organization_id = org.id AND sl.is_active = true
    ), '[]'::jsonb)
  ),
  'Auto-generated from existing stylist levels. One plan per organization.'
FROM public.organizations org
WHERE EXISTS (
  SELECT 1 FROM public.stylist_levels sl WHERE sl.organization_id = org.id
)
ON CONFLICT (organization_id, slug) DO NOTHING;

-- Backfill assignments for every active employee with a stylist_level
INSERT INTO public.user_compensation_assignments (
  organization_id, user_id, plan_id, effective_from, notes
)
SELECT
  ep.organization_id,
  ep.user_id,
  cp.id,
  CURRENT_DATE,
  'Auto-assigned during compensation_plans backfill'
FROM public.employee_profiles ep
JOIN public.compensation_plans cp
  ON cp.organization_id = ep.organization_id
  AND cp.slug = 'level-based-default'
WHERE ep.is_active = true
  AND ep.stylist_level IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_compensation_assignments uca
    WHERE uca.organization_id = ep.organization_id
      AND uca.user_id = ep.user_id
      AND uca.effective_to IS NULL
  );
