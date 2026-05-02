
CREATE TABLE IF NOT EXISTS public.review_request_dispatch_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_id  uuid NOT NULL,
  rule_id         uuid REFERENCES public.review_request_automation_rules(id) ON DELETE SET NULL,
  client_id       uuid,
  client_phone    text,
  client_email    text,
  channel         text NOT NULL DEFAULT 'sms',
  scheduled_for   timestamptz NOT NULL,
  sent_at         timestamptz,
  skipped_at      timestamptz,
  skipped_reason  text,
  survey_response_id uuid,
  attempts        int  NOT NULL DEFAULT 0,
  last_error      text,
  enqueued_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, appointment_id, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_review_dispatch_due
  ON public.review_request_dispatch_queue (scheduled_for)
  WHERE sent_at IS NULL AND skipped_at IS NULL;

ALTER TABLE public.review_request_dispatch_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins view their dispatch queue"
  ON public.review_request_dispatch_queue
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

INSERT INTO public.sms_templates (template_key, name, message_body, description, variables, is_active)
VALUES (
  'review_request_default',
  'Default Review Request',
  'Hi {{client_first_name}}, thanks for visiting {{business_name}}! We''d love your feedback: {{feedback_url}}',
  'Sent after a completed appointment by the Reputation Engine dispatcher.',
  ARRAY['client_first_name','business_name','feedback_url']::text[],
  true
)
ON CONFLICT (template_key) DO NOTHING;

DO $$
DECLARE
  job_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'dispatch-review-requests')
    INTO job_exists;
  IF NOT job_exists THEN
    PERFORM cron.schedule(
      'dispatch-review-requests',
      '15 * * * *',
      $cmd$
        SELECT net.http_post(
          url := 'https://vciqmwzgfjxtzagaxgnh.supabase.co/functions/v1/dispatch-review-requests',
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
