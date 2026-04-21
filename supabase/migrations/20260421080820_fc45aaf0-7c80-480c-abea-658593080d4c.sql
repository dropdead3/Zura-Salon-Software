-- Wave 13F.D fix — security_invoker view
CREATE OR REPLACE VIEW public.org_setup_funnel_health
  WITH (security_invoker = on)
AS
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
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY (metadata->>'dwell_ms')::numeric
  ) FILTER (WHERE event = 'completed' AND metadata ? 'dwell_ms') AS median_completion_dwell_ms,
  MAX(occurred_at) AS last_event_at
FROM public.org_setup_step_events
WHERE step_key IS NOT NULL
GROUP BY step_key, step_number;
