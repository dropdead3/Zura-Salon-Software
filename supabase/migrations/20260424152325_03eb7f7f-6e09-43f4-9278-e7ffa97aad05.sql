-- =========================================================================
-- v_client_visit_stats — single source of truth for per-client visit metrics
--
-- Visits are derived from phorest_appointments using the same gap-≤-5-min
-- contiguity rule as the JS utilities at:
--   - src/lib/visit-grouping.ts          (MAX_VISIT_GAP_MINUTES)
--   - src/lib/client-visit-grouping.ts   (MAX_VISIT_GAP_MINUTES)
-- If you change the gap here, change it in both TS files too. Drift between
-- the three would let the schedule, the client timeline, and the directory
-- show different visit counts for the same client.
--
-- Doctrine references:
--   mem://architecture/phorest-decoupling-and-zura-native-operations
--   mem://features/client-lifetime-value-clv
-- =========================================================================

CREATE OR REPLACE VIEW public.v_client_visit_stats AS
WITH ordered AS (
  SELECT
    a.phorest_client_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.location_id,
    a.total_price,
    a.status,
    LAG(a.end_time)         OVER w AS prev_end,
    LAG(a.appointment_date) OVER w AS prev_date,
    LAG(a.location_id)      OVER w AS prev_location
  FROM public.phorest_appointments a
  WHERE a.phorest_client_id IS NOT NULL
    AND a.deleted_at IS NULL
    AND a.is_archived IS NOT TRUE
  WINDOW w AS (
    PARTITION BY a.phorest_client_id
    ORDER BY a.appointment_date, a.start_time
  )
),
flagged AS (
  SELECT
    *,
    CASE
      WHEN prev_end IS NULL                                          THEN 1
      WHEN appointment_date <> prev_date                             THEN 1
      WHEN COALESCE(location_id, '') <> COALESCE(prev_location, '') THEN 1
      WHEN EXTRACT(EPOCH FROM (start_time - prev_end))/60 > 5        THEN 1
      ELSE 0
    END AS visit_break
  FROM ordered
),
grouped AS (
  SELECT
    phorest_client_id,
    SUM(visit_break) OVER (
      PARTITION BY phorest_client_id
      ORDER BY appointment_date, start_time
    ) AS visit_index,
    appointment_date,
    total_price,
    status
  FROM flagged
),
visits AS (
  SELECT
    phorest_client_id,
    visit_index,
    MIN(appointment_date)            AS visit_date,
    SUM(COALESCE(total_price, 0))    AS visit_total,
    -- Aggregate-status logic mirrors src/lib/client-visit-grouping.ts:
    -- a visit "counts" if any member is non-cancelled.
    bool_or(status <> 'cancelled')   AS counts_as_visit,
    bool_or(status = 'completed')    AS has_completed
  FROM grouped
  GROUP BY phorest_client_id, visit_index
)
SELECT
  phorest_client_id,
  COUNT(*) FILTER (WHERE counts_as_visit)         AS visit_count_grouped,
  COUNT(*) FILTER (WHERE has_completed)           AS completed_visit_count,
  MAX(visit_date) FILTER (WHERE has_completed)    AS last_visit_date,
  MIN(visit_date) FILTER (WHERE has_completed)    AS first_visit_date,
  -- Spend reflects only completed visits — bookings/no-shows must not
  -- inflate spend (CLV doctrine).
  SUM(visit_total) FILTER (WHERE has_completed)   AS total_spend_observed
FROM visits
GROUP BY phorest_client_id;

COMMENT ON VIEW public.v_client_visit_stats IS
  'Per-client visit metrics derived from phorest_appointments using the gap-≤-5-min contiguity rule. Source of truth for clients.visit_count, clients.total_spend, and clients.last_visit_date. Mirrored into the clients table by refresh_client_visit_stats(). Phorest sync MUST NOT write to those columns directly.';

-- =========================================================================
-- refresh_client_visit_stats(p_organization_id uuid DEFAULT NULL)
--
-- Cache the view's output into clients.visit_count / total_spend /
-- last_visit_date. Idempotent — IS DISTINCT FROM guard means rows that
-- already match are skipped, so this is cheap to call after every
-- appointment write.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.refresh_client_visit_stats(
  p_organization_id uuid DEFAULT NULL
)
RETURNS TABLE(updated_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH upd AS (
    UPDATE public.clients c
    SET
      visit_count     = COALESCE(s.visit_count_grouped, 0),
      total_spend     = COALESCE(s.total_spend_observed, 0),
      last_visit_date = s.last_visit_date,
      updated_at      = now()
    FROM public.v_client_visit_stats s
    WHERE c.phorest_client_id = s.phorest_client_id
      AND c.is_archived IS NOT TRUE
      AND (p_organization_id IS NULL OR c.organization_id = p_organization_id)
      AND (
            c.visit_count     IS DISTINCT FROM COALESCE(s.visit_count_grouped, 0)
         OR c.total_spend     IS DISTINCT FROM COALESCE(s.total_spend_observed, 0)
         OR c.last_visit_date IS DISTINCT FROM s.last_visit_date
      )
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_count FROM upd;
  RETURN QUERY SELECT v_count;
END;
$$;

COMMENT ON FUNCTION public.refresh_client_visit_stats(uuid) IS
  'Mirrors v_client_visit_stats into the clients table. Call after appointment writes (status changes, reschedules, cancellations) and at the end of every Phorest sync. Idempotent.';

GRANT EXECUTE ON FUNCTION public.refresh_client_visit_stats(uuid) TO authenticated, service_role;

-- =========================================================================
-- Backfill: fix the 1,087 clients with appointment history whose cached
-- columns are currently 0/null because of the old Phorest-roll-up sync path.
-- =========================================================================

SELECT public.refresh_client_visit_stats(NULL);
