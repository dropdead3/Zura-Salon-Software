-- Create seo_object_revenue table
CREATE TABLE IF NOT EXISTS public.seo_object_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seo_object_id UUID NOT NULL REFERENCES public.seo_objects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one snapshot per object per period
CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_object_revenue_unique
  ON public.seo_object_revenue(seo_object_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_seo_object_revenue_org
  ON public.seo_object_revenue(organization_id);

CREATE INDEX IF NOT EXISTS idx_seo_object_revenue_object
  ON public.seo_object_revenue(seo_object_id);

-- Enable RLS
ALTER TABLE public.seo_object_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seo_object_revenue"
  ON public.seo_object_revenue FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create seo_object_revenue"
  ON public.seo_object_revenue FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update seo_object_revenue"
  ON public.seo_object_revenue FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete seo_object_revenue"
  ON public.seo_object_revenue FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Add actual_revenue_impact column to seo_campaigns
ALTER TABLE public.seo_campaigns
  ADD COLUMN IF NOT EXISTS actual_revenue_impact JSONB DEFAULT NULL;