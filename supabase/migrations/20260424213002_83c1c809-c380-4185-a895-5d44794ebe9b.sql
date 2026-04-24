
DROP VIEW IF EXISTS public.v_phorest_source_duplicates;

CREATE VIEW public.v_phorest_source_duplicates
WITH (security_invoker = true) AS
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
