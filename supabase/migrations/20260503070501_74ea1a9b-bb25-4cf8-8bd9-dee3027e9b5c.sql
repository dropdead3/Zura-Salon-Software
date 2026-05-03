-- P3 #10: Audit-log when the retention coupon is OFFERED.
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

  -- Audit row (Platform Console Pattern: every mutation logs).
  INSERT INTO reputation_admin_actions (
    actor_user_id, target_organization_id, action_type, reason, metadata
  ) VALUES (
    auth.uid(), _organization_id, 'retention_coupon_offered',
    'save_offer_rendered',
    jsonb_build_object('offered_at', v_now)
  );

  RETURN v_now;
END;
$$;

-- P3 #11: Grace cadence dedupe table — fires day-3 / day-14 / day-28 emails
-- exactly once per org+stage. Platform-only RLS.
CREATE TABLE IF NOT EXISTS public.reputation_grace_emails_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  grace_until timestamp with time zone NOT NULL,
  stage text NOT NULL CHECK (stage IN ('day_3','day_14','day_28')),
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  email_recipient text,
  UNIQUE (organization_id, grace_until, stage)
);

CREATE INDEX IF NOT EXISTS idx_reputation_grace_emails_org
  ON public.reputation_grace_emails_sent (organization_id, sent_at DESC);

ALTER TABLE public.reputation_grace_emails_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff read grace email log"
  ON public.reputation_grace_emails_sent FOR SELECT
  USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform staff insert grace email log"
  ON public.reputation_grace_emails_sent FOR INSERT
  WITH CHECK (public.is_platform_user(auth.uid()));