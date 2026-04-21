-- Wave 13G.A — wizard contract precision: persist fields the orchestrator currently drops
ALTER TABLE public.policy_org_profile
  ADD COLUMN IF NOT EXISTS total_team_count INTEGER,
  ADD COLUMN IF NOT EXISTS unmodeled_structure TEXT,
  ADD COLUMN IF NOT EXISTS unmodeled_categories TEXT,
  ADD COLUMN IF NOT EXISTS unmodeled_compensation TEXT;

-- Wave 13G.F — Tier-1 app decline path (autonomy doctrine)
ALTER TABLE public.app_interest
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'interested';

-- Constrain to known values; keep small + extensible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_interest_status_check'
  ) THEN
    ALTER TABLE public.app_interest
      ADD CONSTRAINT app_interest_status_check
      CHECK (status IN ('interested', 'declined', 'activated'));
  END IF;
END $$;