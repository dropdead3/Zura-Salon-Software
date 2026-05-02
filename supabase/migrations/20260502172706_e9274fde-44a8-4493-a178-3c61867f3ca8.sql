CREATE TABLE IF NOT EXISTS public.promo_goal_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  offer_code      text NOT NULL,
  cap             integer NOT NULL CHECK (cap > 0),
  redemptions_at_hit integer NOT NULL CHECK (redemptions_at_hit >= 0),
  started_at      timestamptz,
  hit_at          timestamptz NOT NULL DEFAULT now(),
  days_taken      numeric,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_goal_runs_org_code_hit
  ON public.promo_goal_runs (organization_id, offer_code, hit_at DESC);

ALTER TABLE public.promo_goal_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read promo_goal_runs"
  ON public.promo_goal_runs FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members insert promo_goal_runs"
  ON public.promo_goal_runs FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

COMMENT ON TABLE public.promo_goal_runs IS
  'PR 4 enhancement - historical record of promotional-popup goal-cap hits. Powers the editor baseline-recalibration nudge ("last 3 promos all hit cap in <48h"). Immutable; cascade-delete with organization.';