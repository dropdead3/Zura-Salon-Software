
-- Track auto-hidden curated testimonials so we can un-hide on resubscribe
ALTER TABLE public.website_testimonials
  ADD COLUMN IF NOT EXISTS auto_hidden_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_hidden_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_website_testimonials_auto_hidden
  ON public.website_testimonials(organization_id, auto_hidden_at)
  WHERE auto_hidden_at IS NOT NULL;

-- Replace entitlement sync to also auto-hide / un-hide curated reviews on flag flip
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

  IF NOT v_enabled THEN
    -- Auto-hide curated testimonials sourced from Reputation (those with source_response_id)
    UPDATE public.website_testimonials
       SET enabled = false,
           auto_hidden_at = now(),
           auto_hidden_reason = 'reputation_subscription_lapsed'
     WHERE organization_id = NEW.organization_id
       AND source_response_id IS NOT NULL
       AND enabled = true
       AND auto_hidden_at IS NULL;
  ELSE
    -- Un-hide previously auto-hidden testimonials
    UPDATE public.website_testimonials
       SET enabled = true,
           auto_hidden_at = NULL,
           auto_hidden_reason = NULL
     WHERE organization_id = NEW.organization_id
       AND auto_hidden_at IS NOT NULL
       AND auto_hidden_reason = 'reputation_subscription_lapsed';
  END IF;

  RETURN NEW;
END;
$$;

-- Grace sweep: flip past_due -> canceled when grace window has elapsed
CREATE OR REPLACE FUNCTION public.sweep_reputation_grace()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE public.reputation_subscriptions
       SET status = 'canceled',
           canceled_at = COALESCE(canceled_at, now()),
           updated_at = now()
     WHERE status = 'past_due'
       AND grace_until IS NOT NULL
       AND grace_until <= now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN COALESCE(v_count, 0);
END;
$$;
