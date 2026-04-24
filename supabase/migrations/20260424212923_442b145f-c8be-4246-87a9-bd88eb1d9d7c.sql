
-- ============================================================
-- Wave S9 (final): Identity Reconciliation
-- Note: Earlier attempts to add email/phone unique indexes failed because
-- Phorest's source data contains legitimate duplicates (same human with
-- multiple phorest_client_ids). The fix must happen upstream in Phorest;
-- Zura faithfully mirrors what Phorest reports. The S9b view exposes those
-- upstream duplicates for leadership cleanup.
-- ============================================================

-- ---------- S9a: Auto-archive 16 shadow duplicates ----------
WITH shadows AS (
  SELECT
    c.id AS shadow_id,
    c.email_normalized,
    c.phone_normalized
  FROM public.clients c
  WHERE c.phorest_client_id IS NULL
    AND c.is_placeholder = false
    AND c.is_archived = false
    AND (c.email IS NOT NULL OR c.phone IS NOT NULL)
),
ranked_matches AS (
  SELECT
    s.shadow_id,
    pc.phorest_client_id,
    ROW_NUMBER() OVER (
      PARTITION BY s.shadow_id
      ORDER BY COALESCE(pc.total_spend, 0) DESC,
               pc.last_visit DESC NULLS LAST,
               pc.phorest_client_id ASC
    ) AS rn
  FROM shadows s
  JOIN public.phorest_clients pc
    ON (s.email_normalized IS NOT NULL
        AND s.email_normalized = pc.email_normalized
        AND s.email_normalized NOT IN ('x@gmail.com','na@gmail.com','na@na.com','none@none.com'))
    OR (s.phone_normalized IS NOT NULL
        AND s.phone_normalized = pc.phone_normalized)
),
canonical AS (
  SELECT shadow_id, phorest_client_id
  FROM ranked_matches
  WHERE rn = 1
)
UPDATE public.clients c
SET is_archived = true,
    archived_at = now(),
    notes = COALESCE(c.notes, '') ||
      E'\n[S9a auto-archived ' || to_char(now(),'YYYY-MM-DD') ||
      '] Reconciled to canonical Phorest record ' || ca.phorest_client_id
FROM canonical ca
WHERE c.id = ca.shadow_id
  AND EXISTS (
    SELECT 1 FROM public.clients existing
    WHERE existing.phorest_client_id = ca.phorest_client_id
      AND existing.id <> c.id
  );

-- ---------- S9b: Phorest source duplicate detection view ----------
CREATE OR REPLACE VIEW public.v_phorest_source_duplicates AS
SELECT
  COALESCE(email_normalized, phone_normalized) AS match_key,
  CASE
    WHEN email_normalized IN ('x@gmail.com','na@gmail.com','na@na.com','none@none.com') THEN 'placeholder-email'
    WHEN email_normalized IS NOT NULL THEN 'email'
    ELSE 'phone'
  END AS match_type,
  COUNT(*) AS duplicate_count,
  array_agg(phorest_client_id ORDER BY total_spend DESC NULLS LAST, last_visit DESC NULLS LAST) AS phorest_ids,
  array_agg(name ORDER BY total_spend DESC NULLS LAST) AS names,
  SUM(COALESCE(total_spend, 0)) AS combined_spend,
  SUM(COALESCE(visit_count, 0)) AS combined_visits,
  MAX(last_visit) AS most_recent_visit,
  (array_agg(phorest_client_id ORDER BY total_spend DESC NULLS LAST, last_visit DESC NULLS LAST))[1] AS canonical_phorest_id
FROM public.phorest_clients
WHERE (email_normalized IS NOT NULL OR phone_normalized IS NOT NULL)
GROUP BY COALESCE(email_normalized, phone_normalized),
         CASE
           WHEN email_normalized IN ('x@gmail.com','na@gmail.com','na@na.com','none@none.com') THEN 'placeholder-email'
           WHEN email_normalized IS NOT NULL THEN 'email'
           ELSE 'phone'
         END
HAVING COUNT(*) > 1;
