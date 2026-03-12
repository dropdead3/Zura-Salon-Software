
-- Create product_cost_history table for tracking cost price changes
CREATE TABLE IF NOT EXISTS public.product_cost_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_name TEXT,
  cost_price NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cost_history_product ON public.product_cost_history(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_history_org ON public.product_cost_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_cost_history_supplier ON public.product_cost_history(organization_id, supplier_name);

-- Enable RLS
ALTER TABLE public.product_cost_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view cost history"
  ON public.product_cost_history FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert cost history"
  ON public.product_cost_history FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Trigger function: log cost changes automatically
CREATE OR REPLACE FUNCTION public.log_cost_price_change()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.cost_price IS DISTINCT FROM NEW.cost_price AND NEW.cost_price IS NOT NULL THEN
    INSERT INTO public.product_cost_history (product_id, organization_id, supplier_name, cost_price)
    VALUES (NEW.id, NEW.organization_id, NEW.supplier_name, NEW.cost_price);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on products table
CREATE TRIGGER trg_log_cost_price_change
  AFTER UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_cost_price_change();
