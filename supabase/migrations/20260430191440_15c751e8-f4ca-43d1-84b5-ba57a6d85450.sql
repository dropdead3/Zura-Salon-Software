-- ── Promo response tracking ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_offer_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  offer_code text NOT NULL DEFAULT '',
  surface text NOT NULL DEFAULT 'all-public',
  response text NOT NULL CHECK (response IN ('accepted','declined','soft')),
  session_id text,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_responses_org_created
  ON public.promo_offer_responses (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promo_responses_org_code
  ON public.promo_offer_responses (organization_id, offer_code, response);

ALTER TABLE public.promo_offer_responses ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's data only.
DROP POLICY IF EXISTS "promo_responses_select_org_members"
  ON public.promo_offer_responses;
CREATE POLICY "promo_responses_select_org_members"
  ON public.promo_offer_responses
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Direct INSERT is blocked; clients must use the SECURITY DEFINER RPC.
-- (No INSERT policy = no inserts via PostgREST for non-service-role users.)

-- ── RPC for anonymous response logging ──────────────────────────────
CREATE OR REPLACE FUNCTION public.record_promo_response(
  p_organization_id uuid,
  p_offer_code text,
  p_surface text,
  p_response text,
  p_session_id text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_referrer text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  IF p_response NOT IN ('accepted','declined','soft') THEN
    RAISE EXCEPTION 'invalid response value: %', p_response;
  END IF;

  INSERT INTO public.promo_offer_responses (
    organization_id, offer_code, surface, response,
    session_id, user_agent, referrer
  ) VALUES (
    p_organization_id,
    COALESCE(NULLIF(p_offer_code, ''), ''),
    COALESCE(NULLIF(p_surface, ''), 'all-public'),
    p_response,
    NULLIF(p_session_id, ''),
    NULLIF(p_user_agent, ''),
    NULLIF(p_referrer, '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_promo_response(
  uuid, text, text, text, text, text, text
) TO anon, authenticated;

-- ── Persist promo code on appointments ──────────────────────────────
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS promo_offer_code text;

CREATE INDEX IF NOT EXISTS idx_appointments_promo_code
  ON public.appointments (organization_id, promo_offer_code)
  WHERE promo_offer_code IS NOT NULL;
