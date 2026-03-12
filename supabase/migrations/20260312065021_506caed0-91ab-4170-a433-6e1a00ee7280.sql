-- Stock counts table for physical inventory counts (stocktakes)
CREATE TABLE IF NOT EXISTS public.stock_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  counted_quantity INTEGER NOT NULL,
  expected_quantity INTEGER NOT NULL,
  variance INTEGER GENERATED ALWAYS AS (counted_quantity - expected_quantity) STORED,
  counted_by UUID REFERENCES auth.users(id),
  counted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view stock counts"
  ON public.stock_counts FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert stock counts"
  ON public.stock_counts FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can update stock counts"
  ON public.stock_counts FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete stock counts"
  ON public.stock_counts FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_counts_org ON public.stock_counts(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_product ON public.stock_counts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_counted_at ON public.stock_counts(counted_at DESC);