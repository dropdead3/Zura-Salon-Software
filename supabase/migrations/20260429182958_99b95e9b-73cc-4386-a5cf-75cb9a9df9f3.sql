-- Tag email and SMS sends originating from team-member archive flow
ALTER TABLE public.email_send_log
  ADD COLUMN IF NOT EXISTS archive_log_id uuid REFERENCES public.team_member_archive_log(id) ON DELETE SET NULL;

ALTER TABLE public.client_communications
  ADD COLUMN IF NOT EXISTS archive_log_id uuid REFERENCES public.team_member_archive_log(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_send_log_archive
  ON public.email_send_log(archive_log_id)
  WHERE archive_log_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_comms_archive
  ON public.client_communications(archive_log_id)
  WHERE archive_log_id IS NOT NULL;

-- Surface the soft-notify SMS template with a clear description in the org's SMS template editor
UPDATE public.sms_templates
SET description = 'Sent automatically to clients reassigned during a team-member archive. Triggered from Team → Archive wizard.'
WHERE template_key = 'stylist-reassignment-soft-notify';