
ALTER TABLE public.review_request_dispatch_queue
  ADD COLUMN IF NOT EXISTS parked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_review_dispatch_parked
  ON public.review_request_dispatch_queue (organization_id, parked_at DESC)
  WHERE parked_at IS NOT NULL;

ALTER TABLE public.review_compliance_log
  DROP CONSTRAINT IF EXISTS rcl_event_chk;

ALTER TABLE public.review_compliance_log
  ADD CONSTRAINT rcl_event_chk CHECK (event_type = ANY (ARRAY[
    'request_sent',
    'request_clicked',
    'feedback_submitted',
    'external_link_clicked',
    'recovery_created',
    'recovery_status_changed',
    'recovery_resolved',
    'rule_changed',
    'template_changed',
    'link_changed',
    'review_request_sent',
    'sms_opt_out',
    'sms_opt_in',
    'recovery_draft_generated',
    'request_parked',
    'ai_feedback_summary_generated'
  ]));
