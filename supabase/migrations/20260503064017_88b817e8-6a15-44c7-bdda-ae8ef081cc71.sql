
-- P0 #2: Retention save-rate analytics — track when the coupon was OFFERED
-- (vs. just when it was applied). Save rate = applied / offered.
ALTER TABLE public.reputation_subscriptions
  ADD COLUMN IF NOT EXISTS retention_coupon_offered_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_reputation_subscriptions_coupon_offered
  ON public.reputation_subscriptions (retention_coupon_offered_at)
  WHERE retention_coupon_offered_at IS NOT NULL;

-- RPC: idempotent stamp of the "offered" timestamp. Called when the
-- retention CTA is rendered/clicked inside the customer's cancel flow.
-- Account-Owner gated via RLS on reputation_subscriptions.
CREATE OR REPLACE FUNCTION public.mark_reputation_retention_coupon_offered(_organization_id uuid)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing timestamp with time zone;
  v_now timestamp with time zone := now();
BEGIN
  IF NOT (is_org_admin(auth.uid(), _organization_id) OR is_platform_user(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT retention_coupon_offered_at INTO v_existing
  FROM reputation_subscriptions
  WHERE organization_id = _organization_id;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  UPDATE reputation_subscriptions
    SET retention_coupon_offered_at = v_now
    WHERE organization_id = _organization_id
      AND retention_coupon_offered_at IS NULL;

  RETURN v_now;
END;
$$;

-- P0 #3: Stripe webhook event log — replay + last-successful timestamp.
-- Platform-only read/write. Source of truth for dunning/billing reconciliation.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  livemode boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','processed','failed','replayed','ignored')),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  payload jsonb NOT NULL,
  error_message text,
  processed_at timestamp with time zone,
  replayed_at timestamp with time zone,
  replay_count integer NOT NULL DEFAULT 0,
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received_at
  ON public.stripe_webhook_events (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
  ON public.stripe_webhook_events (status);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_type
  ON public.stripe_webhook_events (event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_org
  ON public.stripe_webhook_events (organization_id) WHERE organization_id IS NOT NULL;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform users read webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Platform users read webhook events"
  ON public.stripe_webhook_events
  FOR SELECT
  USING (is_platform_user(auth.uid()));

DROP POLICY IF EXISTS "Platform users manage webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Platform users manage webhook events"
  ON public.stripe_webhook_events
  FOR ALL
  USING (is_platform_user(auth.uid()))
  WITH CHECK (is_platform_user(auth.uid()));

CREATE TRIGGER trg_stripe_webhook_events_touch
  BEFORE UPDATE ON public.stripe_webhook_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
