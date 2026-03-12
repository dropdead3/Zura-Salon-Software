
-- Stock transfers table for multi-location inventory transfers
CREATE TABLE public.stock_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_location_id TEXT NOT NULL,
  to_location_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view stock transfers"
  ON public.stock_transfers FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage stock transfers"
  ON public.stock_transfers FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Add items_received_count to purchase_orders if not exists (for partial receipt tracking)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchase_orders' AND column_name='items_received_count') THEN
    ALTER TABLE public.purchase_orders ADD COLUMN items_received_count INTEGER;
  END IF;
END $$;
