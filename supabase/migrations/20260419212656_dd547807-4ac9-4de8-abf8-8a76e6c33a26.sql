DO $$ BEGIN
  CREATE TYPE public.policy_ack_method AS ENUM ('typed_signature', 'checkbox', 'click');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.policy_acknowledgments
  ADD COLUMN IF NOT EXISTS policy_id UUID,
  ADD COLUMN IF NOT EXISTS policy_variant_id UUID,
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS signature_text TEXT,
  ADD COLUMN IF NOT EXISTS acknowledgment_method public.policy_ack_method DEFAULT 'typed_signature',
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS appointment_id UUID;

CREATE INDEX IF NOT EXISTS idx_policy_ack_policy ON public.policy_acknowledgments(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_email_lower ON public.policy_acknowledgments((lower(client_email)));
CREATE INDEX IF NOT EXISTS idx_policy_ack_appointment ON public.policy_acknowledgments(appointment_id);