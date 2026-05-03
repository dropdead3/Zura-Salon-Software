-- Reputation subscription state
CREATE TABLE IF NOT EXISTS public.reputation_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled')),
  grant_source TEXT NOT NULL DEFAULT 'stripe' CHECK (grant_source IN ('stripe','platform_grant','trial')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  grace_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reputation_subscriptions_org ON public.reputation_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_reputation_subscriptions_status ON public.reputation_subscriptions(status);

ALTER TABLE public.reputation_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read reputation subscription"
  ON public.reputation_subscriptions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_user(auth.uid()));

CREATE POLICY "Org admins manage reputation subscription"
  ON public.reputation_subscriptions FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.is_platform_user(auth.uid()));

CREATE TRIGGER trg_reputation_subscriptions_touch
  BEFORE UPDATE ON public.reputation_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sync entitlement flag when subscription state changes
CREATE OR REPLACE FUNCTION public.sync_reputation_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  v_enabled := (NEW.status IN ('trialing','active'))
               OR (NEW.status = 'past_due' AND NEW.grace_until IS NOT NULL AND NEW.grace_until > now());

  INSERT INTO public.organization_feature_flags (organization_id, flag_key, is_enabled)
  VALUES (NEW.organization_id, 'reputation_enabled', v_enabled)
  ON CONFLICT (organization_id, flag_key)
  DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_reputation_entitlement
  AFTER INSERT OR UPDATE OF status, grace_until ON public.reputation_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_reputation_entitlement();