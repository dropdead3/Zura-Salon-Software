-- Phase 3: deterministic appointment ↔ transaction-item linkage backfill.

DO $$
DECLARE
  tier1_count INT;
  tier2_count INT;
  tier3_count INT;
  total_service INT;
  total_linked INT;
  coverage_pct NUMERIC;
BEGIN
  -- Tier 1: client + date + staff + normalized service name
  WITH candidates AS (
    SELECT
      t.id AS tx_item_id,
      a_match.appt_id,
      a_match.match_count
    FROM public.phorest_transaction_items t
    CROSS JOIN LATERAL (
      SELECT
        (array_agg(a.id ORDER BY a.start_time))[1] AS appt_id,
        COUNT(*) AS match_count
      FROM public.phorest_appointments a
      WHERE a.appointment_date = t.transaction_date
        AND a.phorest_client_id = t.phorest_client_id
        AND a.phorest_staff_id IS NOT DISTINCT FROM t.phorest_staff_id
        AND COALESCE(a.is_archived, false) = false
        AND a.deleted_at IS NULL
        AND (
          lower(regexp_replace(a.service_name, '\s+', ' ', 'g'))
            = lower(regexp_replace(t.item_name, '\s+', ' ', 'g'))
          OR lower(regexp_replace(a.service_name, '\s+', ' ', 'g'))
            LIKE lower(regexp_replace(t.item_name, '\s+', ' ', 'g')) || '%'
          OR lower(regexp_replace(t.item_name, '\s+', ' ', 'g'))
            LIKE lower(regexp_replace(a.service_name, '\s+', ' ', 'g')) || '%'
        )
    ) a_match
    WHERE t.appointment_id IS NULL
      AND t.item_type = 'service'
      AND t.phorest_client_id IS NOT NULL
  )
  UPDATE public.phorest_transaction_items t
     SET appointment_id = c.appt_id
    FROM candidates c
   WHERE t.id = c.tx_item_id
     AND c.appt_id IS NOT NULL
     AND c.match_count = 1;
  GET DIAGNOSTICS tier1_count = ROW_COUNT;
  RAISE NOTICE '[Linkage] Tier 1 rows linked: %', tier1_count;

  -- Tier 2: client + date + staff (unique only)
  WITH candidates AS (
    SELECT
      t.id AS tx_item_id,
      a_match.appt_id,
      a_match.match_count
    FROM public.phorest_transaction_items t
    CROSS JOIN LATERAL (
      SELECT
        (array_agg(a.id ORDER BY a.start_time))[1] AS appt_id,
        COUNT(*) AS match_count
      FROM public.phorest_appointments a
      WHERE a.appointment_date = t.transaction_date
        AND a.phorest_client_id = t.phorest_client_id
        AND a.phorest_staff_id IS NOT DISTINCT FROM t.phorest_staff_id
        AND COALESCE(a.is_archived, false) = false
        AND a.deleted_at IS NULL
    ) a_match
    WHERE t.appointment_id IS NULL
      AND t.item_type = 'service'
      AND t.phorest_client_id IS NOT NULL
  )
  UPDATE public.phorest_transaction_items t
     SET appointment_id = c.appt_id
    FROM candidates c
   WHERE t.id = c.tx_item_id
     AND c.appt_id IS NOT NULL
     AND c.match_count = 1;
  GET DIAGNOSTICS tier2_count = ROW_COUNT;
  RAISE NOTICE '[Linkage] Tier 2 rows linked: %', tier2_count;

  -- Tier 3: client + date (unique only)
  WITH candidates AS (
    SELECT
      t.id AS tx_item_id,
      a_match.appt_id,
      a_match.match_count
    FROM public.phorest_transaction_items t
    CROSS JOIN LATERAL (
      SELECT
        (array_agg(a.id ORDER BY a.start_time))[1] AS appt_id,
        COUNT(*) AS match_count
      FROM public.phorest_appointments a
      WHERE a.appointment_date = t.transaction_date
        AND a.phorest_client_id = t.phorest_client_id
        AND COALESCE(a.is_archived, false) = false
        AND a.deleted_at IS NULL
    ) a_match
    WHERE t.appointment_id IS NULL
      AND t.item_type = 'service'
      AND t.phorest_client_id IS NOT NULL
  )
  UPDATE public.phorest_transaction_items t
     SET appointment_id = c.appt_id
    FROM candidates c
   WHERE t.id = c.tx_item_id
     AND c.appt_id IS NOT NULL
     AND c.match_count = 1;
  GET DIAGNOSTICS tier3_count = ROW_COUNT;
  RAISE NOTICE '[Linkage] Tier 3 rows linked: %', tier3_count;

  SELECT COUNT(*) FILTER (WHERE item_type = 'service'),
         COUNT(*) FILTER (WHERE item_type = 'service' AND appointment_id IS NOT NULL)
    INTO total_service, total_linked
    FROM public.phorest_transaction_items;

  coverage_pct := CASE WHEN total_service > 0
                       THEN ROUND((total_linked::numeric / total_service) * 100, 1)
                       ELSE 0 END;

  RAISE NOTICE '[Linkage] Coverage: % of % service items linked (% pct)', total_linked, total_service, coverage_pct;
END $$;

-- Helper function for sync-time linkage; same three-tier logic, scoped to a branch + date range.
CREATE OR REPLACE FUNCTION public.link_transaction_items_to_appointments(
  p_location_id TEXT,
  p_date_from DATE,
  p_date_to DATE
) RETURNS TABLE(tier1 INT, tier2 INT, tier3 INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  c1 INT;
  c2 INT;
  c3 INT;
BEGIN
  WITH candidates AS (
    SELECT t.id AS tx_item_id, a_match.appt_id, a_match.match_count
    FROM public.phorest_transaction_items t
    CROSS JOIN LATERAL (
      SELECT (array_agg(a.id ORDER BY a.start_time))[1] AS appt_id, COUNT(*) AS match_count
      FROM public.phorest_appointments a
      WHERE a.appointment_date = t.transaction_date
        AND a.phorest_client_id = t.phorest_client_id
        AND a.phorest_staff_id IS NOT DISTINCT FROM t.phorest_staff_id
        AND COALESCE(a.is_archived, false) = false
        AND a.deleted_at IS NULL
        AND (
          lower(regexp_replace(a.service_name, '\s+', ' ', 'g'))
            = lower(regexp_replace(t.item_name, '\s+', ' ', 'g'))
          OR lower(regexp_replace(a.service_name, '\s+', ' ', 'g'))
            LIKE lower(regexp_replace(t.item_name, '\s+', ' ', 'g')) || '%'
          OR lower(regexp_replace(t.item_name, '\s+', ' ', 'g'))
            LIKE lower(regexp_replace(a.service_name, '\s+', ' ', 'g')) || '%'
        )
    ) a_match
    WHERE t.appointment_id IS NULL AND t.item_type = 'service' AND t.phorest_client_id IS NOT NULL
      AND t.location_id = p_location_id
      AND t.transaction_date BETWEEN p_date_from AND p_date_to
  )
  UPDATE public.phorest_transaction_items t
     SET appointment_id = c.appt_id
    FROM candidates c
   WHERE t.id = c.tx_item_id AND c.appt_id IS NOT NULL AND c.match_count = 1;
  GET DIAGNOSTICS c1 = ROW_COUNT;

  WITH candidates AS (
    SELECT t.id AS tx_item_id, a_match.appt_id, a_match.match_count
    FROM public.phorest_transaction_items t
    CROSS JOIN LATERAL (
      SELECT (array_agg(a.id ORDER BY a.start_time))[1] AS appt_id, COUNT(*) AS match_count
      FROM public.phorest_appointments a
      WHERE a.appointment_date = t.transaction_date
        AND a.phorest_client_id = t.phorest_client_id
        AND a.phorest_staff_id IS NOT DISTINCT FROM t.phorest_staff_id
        AND COALESCE(a.is_archived, false) = false
        AND a.deleted_at IS NULL
    ) a_match
    WHERE t.appointment_id IS NULL AND t.item_type = 'service' AND t.phorest_client_id IS NOT NULL
      AND t.location_id = p_location_id
      AND t.transaction_date BETWEEN p_date_from AND p_date_to
  )
  UPDATE public.phorest_transaction_items t
     SET appointment_id = c.appt_id
    FROM candidates c
   WHERE t.id = c.tx_item_id AND c.appt_id IS NOT NULL AND c.match_count = 1;
  GET DIAGNOSTICS c2 = ROW_COUNT;

  WITH candidates AS (
    SELECT t.id AS tx_item_id, a_match.appt_id, a_match.match_count
    FROM public.phorest_transaction_items t
    CROSS JOIN LATERAL (
      SELECT (array_agg(a.id ORDER BY a.start_time))[1] AS appt_id, COUNT(*) AS match_count
      FROM public.phorest_appointments a
      WHERE a.appointment_date = t.transaction_date
        AND a.phorest_client_id = t.phorest_client_id
        AND COALESCE(a.is_archived, false) = false
        AND a.deleted_at IS NULL
    ) a_match
    WHERE t.appointment_id IS NULL AND t.item_type = 'service' AND t.phorest_client_id IS NOT NULL
      AND t.location_id = p_location_id
      AND t.transaction_date BETWEEN p_date_from AND p_date_to
  )
  UPDATE public.phorest_transaction_items t
     SET appointment_id = c.appt_id
    FROM candidates c
   WHERE t.id = c.tx_item_id AND c.appt_id IS NOT NULL AND c.match_count = 1;
  GET DIAGNOSTICS c3 = ROW_COUNT;

  RETURN QUERY SELECT c1, c2, c3;
END;
$func$;

CREATE INDEX IF NOT EXISTS idx_phorest_appts_client_date_staff
  ON public.phorest_appointments(phorest_client_id, appointment_date, phorest_staff_id)
  WHERE deleted_at IS NULL;