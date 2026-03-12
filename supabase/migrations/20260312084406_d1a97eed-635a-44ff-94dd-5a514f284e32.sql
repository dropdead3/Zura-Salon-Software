
-- ============================================================
-- Phase 4: Inventory Replenishment & Purchasing
-- ============================================================

-- 1a. vendors
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,
  account_number TEXT,
  payment_terms TEXT,
  default_lead_time_days INT DEFAULT 7,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view vendors"
  ON public.vendors FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create vendors"
  ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update vendors"
  ON public.vendors FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete vendors"
  ON public.vendors FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE INDEX IF NOT EXISTS idx_vendors_org ON public.vendors(organization_id);

-- 1b. vendor_products
CREATE TABLE IF NOT EXISTS public.vendor_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_sku TEXT,
  unit_cost NUMERIC,
  moq INT NOT NULL DEFAULT 1,
  pack_size INT DEFAULT 1,
  lead_time_days INT,
  is_preferred BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, product_id)
);

ALTER TABLE public.vendor_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view vendor_products"
  ON public.vendor_products FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create vendor_products"
  ON public.vendor_products FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update vendor_products"
  ON public.vendor_products FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete vendor_products"
  ON public.vendor_products FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_vendor_products_updated_at
  BEFORE UPDATE ON public.vendor_products
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE INDEX IF NOT EXISTS idx_vendor_products_vendor ON public.vendor_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_products_product ON public.vendor_products(product_id);
CREATE INDEX IF NOT EXISTS idx_vendor_products_org ON public.vendor_products(organization_id);

-- 1c. purchase_order_lines
CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_product_id UUID REFERENCES public.vendor_products(id) ON DELETE SET NULL,
  quantity_ordered INT NOT NULL,
  quantity_received INT DEFAULT 0,
  unit_cost NUMERIC,
  line_total NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view po_lines"
  ON public.purchase_order_lines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id
    AND public.is_org_member(auth.uid(), po.organization_id)
  ));

CREATE POLICY "Org members can create po_lines"
  ON public.purchase_order_lines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id
    AND public.is_org_member(auth.uid(), po.organization_id)
  ));

CREATE POLICY "Org admins can update po_lines"
  ON public.purchase_order_lines FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id
    AND public.is_org_admin(auth.uid(), po.organization_id)
  ));

CREATE POLICY "Org admins can delete po_lines"
  ON public.purchase_order_lines FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id
    AND public.is_org_admin(auth.uid(), po.organization_id)
  ));

CREATE INDEX IF NOT EXISTS idx_po_lines_po ON public.purchase_order_lines(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_lines_product ON public.purchase_order_lines(product_id);

-- 1d. receiving_records
CREATE TABLE IF NOT EXISTS public.receiving_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  received_by UUID REFERENCES auth.users(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'complete',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.receiving_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view receiving_records"
  ON public.receiving_records FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create receiving_records"
  ON public.receiving_records FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can update receiving_records"
  ON public.receiving_records FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_receiving_records_po ON public.receiving_records(purchase_order_id);

-- 1e. receiving_record_lines
CREATE TABLE IF NOT EXISTS public.receiving_record_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_record_id UUID NOT NULL REFERENCES public.receiving_records(id) ON DELETE CASCADE,
  po_line_id UUID NOT NULL REFERENCES public.purchase_order_lines(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_received INT NOT NULL,
  quantity_damaged INT DEFAULT 0,
  quantity_rejected INT DEFAULT 0,
  lot_number TEXT,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.receiving_record_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view receiving_record_lines"
  ON public.receiving_record_lines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.receiving_records rr
    WHERE rr.id = receiving_record_id
    AND public.is_org_member(auth.uid(), rr.organization_id)
  ));

CREATE POLICY "Org members can create receiving_record_lines"
  ON public.receiving_record_lines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.receiving_records rr
    WHERE rr.id = receiving_record_id
    AND public.is_org_member(auth.uid(), rr.organization_id)
  ));

CREATE INDEX IF NOT EXISTS idx_receiving_lines_record ON public.receiving_record_lines(receiving_record_id);
CREATE INDEX IF NOT EXISTS idx_receiving_lines_po_line ON public.receiving_record_lines(po_line_id);

-- 1f. replenishment_recommendations
CREATE TABLE IF NOT EXISTS public.replenishment_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  daily_usage_rate NUMERIC NOT NULL DEFAULT 0,
  usage_stddev NUMERIC DEFAULT 0,
  lead_time_days INT NOT NULL DEFAULT 7,
  safety_stock NUMERIC NOT NULL DEFAULT 0,
  reorder_point NUMERIC NOT NULL DEFAULT 0,
  target_stock NUMERIC NOT NULL DEFAULT 0,
  recommended_qty INT NOT NULL DEFAULT 0,
  current_on_hand NUMERIC DEFAULT 0,
  open_po_qty INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.replenishment_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view recommendations"
  ON public.replenishment_recommendations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create recommendations"
  ON public.replenishment_recommendations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can update recommendations"
  ON public.replenishment_recommendations FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_replenishment_org ON public.replenishment_recommendations(organization_id);
CREATE INDEX IF NOT EXISTS idx_replenishment_product ON public.replenishment_recommendations(product_id);
CREATE INDEX IF NOT EXISTS idx_replenishment_status ON public.replenishment_recommendations(status);

-- 1g. Alter purchase_orders for multi-line support
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS po_number TEXT,
  ADD COLUMN IF NOT EXISTS line_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receiving_status TEXT DEFAULT 'not_received';

-- Make product_id nullable for multi-line POs
ALTER TABLE public.purchase_orders ALTER COLUMN product_id DROP NOT NULL;
