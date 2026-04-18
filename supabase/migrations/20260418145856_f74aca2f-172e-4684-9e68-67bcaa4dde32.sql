DROP POLICY IF EXISTS "Public can create bookings" ON public.day_rate_bookings;

CREATE POLICY "Public can create pending bookings"
  ON public.day_rate_bookings
  FOR INSERT
  WITH CHECK (
    status = 'pending'::day_rate_booking_status
    AND stripe_payment_id IS NULL
    AND agreement_signed_at IS NULL
    AND notes IS NULL
  );

DROP POLICY IF EXISTS "Anyone can insert applications (public form)" ON public.job_applications;

CREATE POLICY "Public can submit new applications"
  ON public.job_applications
  FOR INSERT
  WITH CHECK (
    pipeline_stage = 'new'
    AND rating IS NULL
    AND (is_starred IS NULL OR is_starred = false)
    AND assigned_to IS NULL
    AND (is_archived IS NULL OR is_archived = false)
    AND last_contacted_at IS NULL
  );