
-- Create tip_distributions table
CREATE TABLE IF NOT EXISTS public.tip_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  stylist_user_id UUID NOT NULL,
  distribution_date DATE NOT NULL,
  total_tips NUMERIC(10,2) NOT NULL DEFAULT 0,
  cash_tips NUMERIC(10,2) NOT NULL DEFAULT 0,
  card_tips NUMERIC(10,2) NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'pending',
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tip_distributions ENABLE ROW LEVEL SECURITY;

-- Org members can view
CREATE POLICY "Org members can view tip distributions"
  ON public.tip_distributions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- Org admins can create
CREATE POLICY "Org admins can create tip distributions"
  ON public.tip_distributions FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Org admins can update
CREATE POLICY "Org admins can update tip distributions"
  ON public.tip_distributions FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Org admins can delete
CREATE POLICY "Org admins can delete tip distributions"
  ON public.tip_distributions FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tip_distributions_org ON public.tip_distributions(organization_id);
CREATE INDEX IF NOT EXISTS idx_tip_distributions_stylist ON public.tip_distributions(stylist_user_id, distribution_date);
CREATE INDEX IF NOT EXISTS idx_tip_distributions_date ON public.tip_distributions(organization_id, distribution_date);

-- Unique constraint to prevent duplicate distributions per stylist per day per location
CREATE UNIQUE INDEX IF NOT EXISTS idx_tip_distributions_unique
  ON public.tip_distributions(organization_id, stylist_user_id, distribution_date, COALESCE(location_id, '__all__'));

-- Updated_at trigger
CREATE TRIGGER update_tip_distributions_updated_at
  BEFORE UPDATE ON public.tip_distributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
