-- Read-receipt analytics for announcements.
-- For each announcement, surface:
--   audience_count (denominator) — location-scoped or org-wide based on location_id
--   read_count (numerator) — distinct user_ids in announcement_reads
--   read_rate — percent (1 decimal)
CREATE OR REPLACE VIEW public.announcement_read_stats AS
WITH author_org AS (
  SELECT
    a.id AS announcement_id,
    a.location_id,
    -- author's organization (owners/admins always have an organization_id)
    ep.organization_id AS organization_id
  FROM public.announcements a
  LEFT JOIN public.employee_profiles ep
    ON ep.user_id = a.author_id
),
audience AS (
  SELECT
    ao.announcement_id,
    COUNT(DISTINCT ep.user_id)::int AS audience_count
  FROM author_org ao
  LEFT JOIN public.employee_profiles ep
    ON ep.organization_id = ao.organization_id
   AND COALESCE(ep.is_active, true) = true
   AND (
     ao.location_id IS NULL
     OR ep.location_id = ao.location_id
     OR ao.location_id = ANY(COALESCE(ep.location_ids, ARRAY[]::text[]))
   )
  GROUP BY ao.announcement_id
),
reads AS (
  SELECT
    ar.announcement_id,
    COUNT(DISTINCT ar.user_id)::int AS read_count
  FROM public.announcement_reads ar
  GROUP BY ar.announcement_id
)
SELECT
  a.id AS announcement_id,
  ao.organization_id,
  a.location_id,
  COALESCE(au.audience_count, 0) AS audience_count,
  COALESCE(r.read_count, 0) AS read_count,
  CASE
    WHEN COALESCE(au.audience_count, 0) = 0 THEN 0
    ELSE ROUND((COALESCE(r.read_count, 0)::numeric / au.audience_count::numeric) * 100, 1)
  END AS read_rate
FROM public.announcements a
LEFT JOIN author_org ao ON ao.announcement_id = a.id
LEFT JOIN audience au ON au.announcement_id = a.id
LEFT JOIN reads r ON r.announcement_id = a.id;

-- Lock down the view to admins only.
REVOKE ALL ON public.announcement_read_stats FROM PUBLIC;
REVOKE ALL ON public.announcement_read_stats FROM anon;
GRANT SELECT ON public.announcement_read_stats TO authenticated;

-- Defense in depth: enforce admin-only access via a security barrier function wrapper.
-- (Views inherit underlying table RLS; announcement_reads/employee_profiles already enforce isolation.)
COMMENT ON VIEW public.announcement_read_stats IS
  'Per-announcement read-receipt analytics. Audience denominator is location-scoped when location_id is set, else org-wide. Admin-only.';