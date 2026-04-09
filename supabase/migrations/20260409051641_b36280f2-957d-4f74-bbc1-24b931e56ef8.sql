CREATE TABLE public.search_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  query_pattern TEXT NOT NULL,
  promoted_path TEXT NOT NULL,
  boost_amount NUMERIC NOT NULL DEFAULT 0.10,
  demoted BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE (organization_id, query_pattern, promoted_path)
);

ALTER TABLE public.search_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage search promotions"
  ON public.search_promotions FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org members read search promotions"
  ON public.search_promotions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_search_promotions_org ON public.search_promotions(organization_id);

CREATE TRIGGER update_search_promotions_updated_at
  BEFORE UPDATE ON public.search_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();