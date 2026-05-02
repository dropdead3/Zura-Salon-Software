-- =========================================================================
-- Reputation Engine P1: SLA timestamps, SMS opt-out registry, retry backoff
-- =========================================================================

-- 1) Recovery SLA timestamps -------------------------------------------------
ALTER TABLE public.recovery_tasks
  ADD COLUMN IF NOT EXISTS first_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_contacted_by uuid;

-- Trigger: stamp first_contacted_at the first time status transitions to 'contacted'
CREATE OR REPLACE FUNCTION public.stamp_recovery_first_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'contacted' AND OLD.status <> 'contacted' AND NEW.first_contacted_at IS NULL THEN
    NEW.first_contacted_at := now();
    NEW.first_contacted_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recovery_tasks_stamp_first_contact ON public.recovery_tasks;
CREATE TRIGGER recovery_tasks_stamp_first_contact
  BEFORE UPDATE ON public.recovery_tasks
  FOR EACH ROW EXECUTE FUNCTION public.stamp_recovery_first_contact();

-- 2) SMS opt-out registry ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sms_opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone text NOT NULL,
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'sms_keyword',  -- sms_keyword | manual | api
  raw_message text,
  UNIQUE (organization_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_org_phone
  ON public.sms_opt_outs (organization_id, phone);

ALTER TABLE public.sms_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins read sms opt-outs"
  ON public.sms_opt_outs FOR SELECT
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins manage sms opt-outs"
  ON public.sms_opt_outs FOR ALL
  USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- Service-role inserts (webhook) bypass RLS naturally. No public policy.

-- 3) Dispatch queue retry/backoff -------------------------------------------
ALTER TABLE public.review_request_dispatch_queue
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

-- Bump max attempts ceiling to 5 (dispatcher will read this column)
COMMENT ON COLUMN public.review_request_dispatch_queue.attempts IS
  'Send attempts. Capped at 5 by dispatcher; backoff = 5min * 2^(attempts-1).';