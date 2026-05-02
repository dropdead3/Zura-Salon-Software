-- Recovery outcome tracking: did recovered clients rebook? revenue saved?
CREATE OR REPLACE VIEW public.v_recovery_outcomes AS
WITH resolved AS (
  SELECT
    rt.id AS recovery_task_id,
    rt.organization_id,
    rt.location_id,
    rt.client_id,
    rt.staff_user_id,
    rt.status,
    rt.resolved_at,
    rt.created_at AS task_created_at,
    rt.feedback_response_id
  FROM public.recovery_tasks rt
  WHERE rt.status IN ('resolved', 'refunded', 'redo_booked')
    AND rt.resolved_at IS NOT NULL
    AND rt.client_id IS NOT NULL
),
subsequent AS (
  SELECT
    r.recovery_task_id,
    COUNT(a.id)::int AS rebook_count,
    COALESCE(SUM(COALESCE(a.total_price, 0) - COALESCE(a.tip_amount, 0)), 0)::numeric AS revenue_saved,
    MIN(
      (a.appointment_date::timestamptz)
    ) AS first_rebook_at
  FROM resolved r
  LEFT JOIN public.appointments a
    ON a.client_id = r.client_id
   AND a.organization_id = r.organization_id
   AND a.deleted_at IS NULL
   AND COALESCE(a.status, '') NOT IN ('cancelled', 'no_show')
   AND a.appointment_date::timestamptz > r.resolved_at
   AND a.appointment_date::timestamptz <= r.resolved_at + INTERVAL '90 days'
  GROUP BY r.recovery_task_id
)
SELECT
  r.recovery_task_id,
  r.organization_id,
  r.location_id,
  r.client_id,
  r.staff_user_id,
  r.status,
  r.resolved_at,
  r.task_created_at,
  r.feedback_response_id,
  COALESCE(s.rebook_count, 0) AS rebook_count,
  (COALESCE(s.rebook_count, 0) > 0) AS rebooked,
  COALESCE(s.revenue_saved, 0)::numeric AS revenue_saved,
  s.first_rebook_at,
  CASE
    WHEN s.first_rebook_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (s.first_rebook_at - r.resolved_at)) / 86400.0
    ELSE NULL
  END AS days_to_rebook
FROM resolved r
LEFT JOIN subsequent s ON s.recovery_task_id = r.recovery_task_id;

COMMENT ON VIEW public.v_recovery_outcomes IS
  'P3 reputation engine: ties resolved recovery tasks to subsequent bookings within 90 days. Revenue saved = sum of total_price - tip_amount for post-resolution appointments. Inherits RLS from recovery_tasks + appointments.';