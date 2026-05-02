ALTER TABLE public.promo_offer_impressions
  ADD COLUMN IF NOT EXISTS variant_key text;
ALTER TABLE public.promo_offer_responses
  ADD COLUMN IF NOT EXISTS variant_key text;

CREATE INDEX IF NOT EXISTS idx_promo_impressions_variant
  ON public.promo_offer_impressions (organization_id, offer_code, variant_key)
  WHERE variant_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promo_responses_variant
  ON public.promo_offer_responses (organization_id, offer_code, variant_key)
  WHERE variant_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_promo_impression(
  p_organization_id uuid,
  p_offer_code text,
  p_surface text,
  p_session_id text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_variant_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.promo_offer_impressions
    (organization_id, offer_code, surface, session_id, user_agent, referrer, variant_key)
  VALUES
    (p_organization_id, p_offer_code, p_surface, p_session_id, p_user_agent, p_referrer, p_variant_key)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_promo_response(
  p_organization_id uuid,
  p_offer_code text,
  p_surface text,
  p_response text,
  p_session_id text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_variant_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.promo_offer_responses
    (organization_id, offer_code, surface, response, session_id, user_agent, referrer, variant_key)
  VALUES
    (p_organization_id, p_offer_code, p_surface, p_response, p_session_id, p_user_agent, p_referrer, p_variant_key);
END;
$$;