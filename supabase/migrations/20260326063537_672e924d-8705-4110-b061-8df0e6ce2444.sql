
-- Service price targets: per-service margin goals
CREATE TABLE IF NOT EXISTS public.service_price_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  target_margin_pct NUMERIC NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, service_id)
);

ALTER TABLE public.service_price_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view price targets"
  ON public.service_price_targets FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert price targets"
  ON public.service_price_targets FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update price targets"
  ON public.service_price_targets FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete price targets"
  ON public.service_price_targets FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_service_price_targets_updated_at
  BEFORE UPDATE ON public.service_price_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_service_price_targets_org
  ON public.service_price_targets(organization_id);

CREATE INDEX IF NOT EXISTS idx_service_price_targets_service
  ON public.service_price_targets(service_id);

-- Service price recommendations: log of generated recommendations
CREATE TYPE public.price_recommendation_status AS ENUM ('pending', 'accepted', 'dismissed');

CREATE TABLE IF NOT EXISTS public.service_price_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  current_price NUMERIC NOT NULL,
  recommended_price NUMERIC NOT NULL,
  product_cost NUMERIC NOT NULL,
  margin_pct_current NUMERIC NOT NULL,
  margin_pct_target NUMERIC NOT NULL,
  status public.price_recommendation_status NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_price_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view price recommendations"
  ON public.service_price_recommendations FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert price recommendations"
  ON public.service_price_recommendations FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update price recommendations"
  ON public.service_price_recommendations FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_service_price_recommendations_org
  ON public.service_price_recommendations(organization_id);

CREATE INDEX IF NOT EXISTS idx_service_price_recommendations_service
  ON public.service_price_recommendations(service_id);

CREATE INDEX IF NOT EXISTS idx_service_price_recommendations_status
  ON public.service_price_recommendations(status);
