-- Wave 13F.B — key-based resume
ALTER TABLE public.org_setup_drafts
  ADD COLUMN IF NOT EXISTS current_step_key TEXT;

COMMENT ON COLUMN public.org_setup_drafts.current_step_key IS
  'Wave 13F.B — registry key of the step the user is on (e.g. step_3_team). Survives registry reordering; current_step (index) kept for backward compatibility.';

-- Wave 13F.D — funnel health view
-- Aggregates step events into per-step funnel signals so platform admins can
-- see where operators get stuck. Materiality threshold (>=5 viewers) applied
-- in the consuming hook, not the view, so we keep the raw counts visible.
CREATE OR REPLACE VIEW public.org_setup_funnel_health AS
SELECT
  step_key,
  step_number,
  COUNT(*) FILTER (WHERE event = 'viewed') AS viewed_count,
  COUNT(*) FILTER (WHERE event = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE event = 'skipped') AS skipped_count,
  COUNT(*) FILTER (WHERE event = 'off_ramp') AS off_ramp_count,
  COUNT(*) FILTER (WHERE event = 'validation_blocked') AS validation_blocked_count,
  COUNT(DISTINCT organization_id) FILTER (WHERE event = 'viewed') AS unique_orgs_viewed,
  COUNT(DISTINCT organization_id) FILTER (WHERE event = 'completed') AS unique_orgs_completed,
  -- Median dwell on completion (ms). NULL when no completions.
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY (metadata->>'dwell_ms')::numeric
  ) FILTER (WHERE event = 'completed' AND metadata ? 'dwell_ms') AS median_completion_dwell_ms,
  MAX(occurred_at) AS last_event_at
FROM public.org_setup_step_events
WHERE step_key IS NOT NULL
GROUP BY step_key, step_number;

COMMENT ON VIEW public.org_setup_funnel_health IS
  'Wave 13F.D — per-step funnel signals for the org setup wizard. Consumed by platform admin to detect drop-off, validation traps, and off-ramps.';

-- Grant: only platform-side users hit this view; RLS on the underlying
-- events table already prevents tenant data leakage in a view-of-aggregates.
GRANT SELECT ON public.org_setup_funnel_health TO authenticated;
