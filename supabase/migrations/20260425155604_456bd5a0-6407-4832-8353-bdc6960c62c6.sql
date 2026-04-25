
-- 1. Atomic reconciler RPC ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.reconcile_appointment_status_via_linkage(
  p_location_id text,
  p_date_from date,
  p_date_to date
)
RETURNS TABLE(reconciled_count integer, candidate_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidates integer;
  v_reconciled integer;
BEGIN
  WITH candidates AS (
    SELECT DISTINCT t.appointment_id
    FROM public.phorest_transaction_items t
    WHERE t.location_id = p_location_id
      AND t.item_type = 'service'
      AND t.transaction_date >= p_date_from
      AND t.transaction_date < p_date_to
      AND t.appointment_id IS NOT NULL
  ),
  cand_count AS (
    SELECT COUNT(*)::int AS n FROM candidates
  ),
  promoted AS (
    UPDATE public.phorest_appointments a
    SET status = 'completed', updated_at = now()
    FROM candidates c
    WHERE a.id = c.appointment_id
      AND a.status IN ('booked','confirmed','checked_in')
    RETURNING a.id
  )
  SELECT
    (SELECT COUNT(*)::int FROM promoted),
    (SELECT n FROM cand_count)
  INTO v_reconciled, v_candidates;

  RETURN QUERY SELECT v_reconciled, v_candidates;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_appointment_status_via_linkage(text, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_appointment_status_via_linkage(text, date, date) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_appointment_status_via_linkage(text, date, date) TO service_role;

-- 2. Linkage coverage view (30-day rolling) ---------------------------------
CREATE OR REPLACE VIEW public.v_linkage_coverage_30d AS
SELECT
  t.location_id,
  COUNT(*) FILTER (WHERE t.item_type = 'service')::int AS service_items,
  COUNT(*) FILTER (WHERE t.item_type = 'service' AND t.appointment_id IS NOT NULL)::int AS linked_items,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE t.item_type = 'service' AND t.appointment_id IS NOT NULL)
         / NULLIF(COUNT(*) FILTER (WHERE t.item_type = 'service'), 0),
    2
  )::numeric AS coverage_pct,
  MAX(t.created_at) AS last_sync_at
FROM public.phorest_transaction_items t
WHERE t.transaction_date >= (CURRENT_DATE - INTERVAL '30 days')
GROUP BY t.location_id;

COMMENT ON VIEW public.v_linkage_coverage_30d IS
  'Phase 4 linkage drift gauge. Per-location service-line linkage coverage over the rolling 30-day window. Powers the silent-above-90% Visibility Contract in System Health.';

GRANT SELECT ON public.v_linkage_coverage_30d TO authenticated, service_role;

-- 3. Tip attribution drift skeleton (deferred audit job) --------------------
CREATE TABLE IF NOT EXISTS public.tip_attribution_drift (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL,
  location_id text NOT NULL,
  expected_tip numeric(10,2) NOT NULL,
  linked_tip_sum numeric(10,2) NOT NULL,
  variance numeric(10,2) GENERATED ALWAYS AS (expected_tip - linked_tip_sum) STORED,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  notes text
);

COMMENT ON TABLE public.tip_attribution_drift IS
  'Phase 4 — skeleton for the deferred nightly tip-attribution audit. Populated only once linkage coverage is sustained at >=99% for 14 consecutive days. Until then this table remains empty by design.';

CREATE INDEX IF NOT EXISTS idx_tip_drift_location ON public.tip_attribution_drift(location_id);
CREATE INDEX IF NOT EXISTS idx_tip_drift_detected ON public.tip_attribution_drift(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_tip_drift_unresolved ON public.tip_attribution_drift(resolved_at) WHERE resolved_at IS NULL;

ALTER TABLE public.tip_attribution_drift ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view tip drift for their locations"
  ON public.tip_attribution_drift FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = tip_attribution_drift.location_id
        AND public.is_org_admin(auth.uid(), l.organization_id)
    )
  );
