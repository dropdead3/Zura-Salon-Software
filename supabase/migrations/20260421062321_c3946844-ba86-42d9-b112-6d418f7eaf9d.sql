-- Setup follow-up queue: tracks when a user dismissed the BackfillWelcomeBanner
-- without completing intent + apps. A scheduled job (process-setup-followups)
-- consumes this queue 48h later and emits a reminder if still pending.
CREATE TABLE IF NOT EXISTS public.setup_followup_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  scheduled_for timestamptz NOT NULL,
  enqueued_at   timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz,
  skipped_at    timestamptz,
  skipped_reason text,
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_setup_followup_queue_due
  ON public.setup_followup_queue (scheduled_for)
  WHERE sent_at IS NULL AND skipped_at IS NULL;

ALTER TABLE public.setup_followup_queue ENABLE ROW LEVEL SECURITY;

-- Org admins can view their own queue rows (debug/visibility).
CREATE POLICY "Org admins view their setup followups"
  ON public.setup_followup_queue
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Inserts/updates happen exclusively via service-role edge functions — no
-- direct client writes. (No INSERT/UPDATE/DELETE policies = default deny.)

-- Schedule the processor hourly via pg_cron (idempotent).
DO $$
DECLARE
  job_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'process-setup-followups')
    INTO job_exists;
  IF NOT job_exists THEN
    PERFORM cron.schedule(
      'process-setup-followups',
      '0 * * * *',  -- top of every hour
      $cmd$
        SELECT net.http_post(
          url := 'https://vciqmwzgfjxtzagaxgnh.supabase.co/functions/v1/process-setup-followups',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := '{}'::jsonb
        );
      $cmd$
    );
  END IF;
END $$;