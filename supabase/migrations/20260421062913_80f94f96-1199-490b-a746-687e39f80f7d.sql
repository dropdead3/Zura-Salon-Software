-- Add acquisition source to organizations for funnel cohorting
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS signup_source TEXT;

CREATE INDEX IF NOT EXISTS idx_organizations_signup_source
  ON public.organizations(signup_source)
  WHERE signup_source IS NOT NULL;

COMMENT ON COLUMN public.organizations.signup_source IS
  'Acquisition channel for funnel analysis: organic | invited | migrated | backfilled | imported. Backfill: existing orgs default to NULL (treated as legacy in cohort filter).';