
-- Create retail_recommendation_events table for tracking cross-sell conversion
CREATE TABLE IF NOT EXISTS public.retail_recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  recommended_product_name TEXT NOT NULL,
  service_name TEXT,
  recommended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ,
  recommended_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.retail_recommendation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view recommendation events"
  ON public.retail_recommendation_events FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert recommendation events"
  ON public.retail_recommendation_events FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update recommendation events"
  ON public.retail_recommendation_events FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_retail_rec_events_org_client
  ON public.retail_recommendation_events(organization_id, client_id);

CREATE INDEX IF NOT EXISTS idx_retail_rec_events_product
  ON public.retail_recommendation_events(organization_id, recommended_product_name);
