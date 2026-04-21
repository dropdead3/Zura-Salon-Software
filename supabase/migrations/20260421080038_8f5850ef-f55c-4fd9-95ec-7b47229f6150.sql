-- Wave 13F.A — orchestrator contract repair
-- Add columns to preserve fidelity that the wizard collects but currently drops.

-- Step 0 self-classification: distinguish traditional from rental_heavy / hybrid_unique.
ALTER TABLE public.policy_org_profile
  ADD COLUMN IF NOT EXISTS fit_choice TEXT,
  ADD COLUMN IF NOT EXISTS non_traditional_structure BOOLEAN NOT NULL DEFAULT false;

-- Step 6 tip distribution: preserve the exact model (individual / pooled / team_based / no_tips)
-- instead of squashing to a boolean. The boolean stays for backward compatibility.
ALTER TABLE public.policy_org_profile
  ADD COLUMN IF NOT EXISTS tip_distribution_model TEXT;

COMMENT ON COLUMN public.policy_org_profile.fit_choice IS
  'Step 0 wizard self-classification: traditional | rental_heavy | hybrid_unique | not_a_salon';
COMMENT ON COLUMN public.policy_org_profile.non_traditional_structure IS
  'Wizard flag for rental_heavy / hybrid_unique orgs — gates standard-shop assumptions.';
COMMENT ON COLUMN public.policy_org_profile.tip_distribution_model IS
  'Step 6 wizard fidelity: individual | pooled | team_based | no_tips. uses_tip_pooling is derived.';
