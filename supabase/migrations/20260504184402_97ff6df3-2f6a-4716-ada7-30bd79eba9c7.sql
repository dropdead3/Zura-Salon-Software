-- Schedule daily cron for per-location GBP token verification.
-- Idempotent: unschedule then reschedule.
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'reputation-google-verify-locations-daily';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'reputation-google-verify-locations-daily',
  '23 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vciqmwzgfjxtzagaxgnh.supabase.co/functions/v1/reputation-google-verify-locations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);