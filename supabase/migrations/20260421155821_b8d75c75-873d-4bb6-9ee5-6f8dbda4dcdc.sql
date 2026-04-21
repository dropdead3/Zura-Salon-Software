-- Wave 13H — B9: add `system` column to setup_step_registry as single source of truth
ALTER TABLE public.setup_step_registry
  ADD COLUMN IF NOT EXISTS system text;

-- Backfill from current SYSTEM_BY_STEP mapping
UPDATE public.setup_step_registry SET system = 'fit_check'    WHERE key = 'step_0_fit_check'    AND system IS NULL;
UPDATE public.setup_step_registry SET system = 'identity'     WHERE key = 'step_1_identity'     AND system IS NULL;
UPDATE public.setup_step_registry SET system = 'footprint'    WHERE key = 'step_2_footprint'    AND system IS NULL;
UPDATE public.setup_step_registry SET system = 'team'         WHERE key = 'step_3_team'         AND system IS NULL;
UPDATE public.setup_step_registry SET system = 'compensation' WHERE key = 'step_4_compensation' AND system IS NULL;
UPDATE public.setup_step_registry SET system = 'catalog'      WHERE key = 'step_5_catalog'      AND system IS NULL;
UPDATE public.setup_step_registry SET system = 'standards'    WHERE key = 'step_6_standards'    AND system IS NULL;
UPDATE public.setup_step_registry SET system = 'intent'       WHERE key = 'step_7_intent'       AND system IS NULL;
UPDATE public.setup_step_registry SET system = 'apps'         WHERE key = 'step_7_5_apps'       AND system IS NULL;

-- Wave 13H — B10: wizard-only funnel view that excludes backfill-sourced events
-- Backfill writes synthetic events with metadata.source='backfill'; this view
-- filters them out so platform ops can see true wizard cohort drop-off.
CREATE OR REPLACE VIEW public.org_setup_funnel_health_wizard_only AS
SELECT
  step_key,
  step_number,
  count(*) FILTER (WHERE event = 'viewed') AS viewed_count,
  count(*) FILTER (WHERE event = 'completed') AS completed_count,
  count(*) FILTER (WHERE event = 'skipped') AS skipped_count,
  count(*) FILTER (WHERE event = 'off_ramp') AS off_ramp_count,
  count(*) FILTER (WHERE event = 'validation_blocked') AS validation_blocked_count,
  count(DISTINCT organization_id) FILTER (WHERE event = 'viewed') AS unique_orgs_viewed,
  count(DISTINCT organization_id) FILTER (WHERE event = 'completed') AS unique_orgs_completed,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY ((metadata->>'dwell_ms')::numeric)::double precision)
    FILTER (WHERE event = 'completed' AND metadata ? 'dwell_ms') AS median_completion_dwell_ms,
  max(occurred_at) AS last_event_at
FROM public.org_setup_step_events
WHERE step_key IS NOT NULL
  AND COALESCE(metadata->>'source', '') <> 'backfill'
GROUP BY step_key, step_number;

-- Wave 13H — sibling view for backfill-only cohort (so split-toggle UIs can compare)
CREATE OR REPLACE VIEW public.org_setup_funnel_health_backfill_only AS
SELECT
  step_key,
  step_number,
  count(*) FILTER (WHERE event = 'viewed') AS viewed_count,
  count(*) FILTER (WHERE event = 'completed') AS completed_count,
  count(*) FILTER (WHERE event = 'skipped') AS skipped_count,
  count(*) FILTER (WHERE event = 'off_ramp') AS off_ramp_count,
  count(*) FILTER (WHERE event = 'validation_blocked') AS validation_blocked_count,
  count(DISTINCT organization_id) FILTER (WHERE event = 'viewed') AS unique_orgs_viewed,
  count(DISTINCT organization_id) FILTER (WHERE event = 'completed') AS unique_orgs_completed,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY ((metadata->>'dwell_ms')::numeric)::double precision)
    FILTER (WHERE event = 'completed' AND metadata ? 'dwell_ms') AS median_completion_dwell_ms,
  max(occurred_at) AS last_event_at
FROM public.org_setup_step_events
WHERE step_key IS NOT NULL
  AND metadata->>'source' = 'backfill'
GROUP BY step_key, step_number;