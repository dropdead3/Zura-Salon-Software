
CREATE TABLE IF NOT EXISTS public.promo_offer_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  offer_code text NOT NULL DEFAULT '',
  surface text NOT NULL DEFAULT 'all-public',
  session_id text,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_impressions_org_code
  ON public.promo_offer_impressions (organization_id, offer_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promo_impressions_org_surface
  ON public.promo_offer_impressions (organization_id, surface, created_at DESC);

-- Dedup index: one impression per (org, code, surface, session) — protects
-- against page refresh / re-mount inflation. Partial index excludes anonymous
-- (null session_id) rows, which fall back to row-level dedup at write time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_impressions_session
  ON public.promo_offer_impressions (organization_id, offer_code, surface, session_id)
  WHERE session_id IS NOT NULL;

ALTER TABLE public.promo_offer_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_impressions_select_org_members"
  ON public.promo_offer_impressions
  FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- No INSERT policy — writes funnel exclusively through the SECURITY DEFINER
-- RPC below so anonymous public visitors can record without us widening RLS.

CREATE OR REPLACE FUNCTION public.record_promo_impression(
  p_organization_id uuid,
  p_offer_code text,
  p_surface text,
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

  INSERT INTO public.promo_offer_impressions (
    organization_id, offer_code, surface, session_id, user_agent, referrer
  ) VALUES (
    p_organization_id,
    COALESCE(NULLIF(p_offer_code, ''), ''),
    COALESCE(NULLIF(p_surface, ''), 'all-public'),
    NULLIF(p_session_id, ''),
    NULLIF(p_user_agent, ''),
    NULLIF(p_referrer, '')
  )
  ON CONFLICT (organization_id, offer_code, surface, session_id)
    WHERE session_id IS NOT NULL
    DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_promo_impression(uuid, text, text, text, text, text)
  TO anon, authenticated;
