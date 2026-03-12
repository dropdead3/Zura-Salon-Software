
-- Fix trigger to handle missing supplier_name on products table
-- Use supplier_id to look up supplier_name from product_suppliers
CREATE OR REPLACE FUNCTION public.log_cost_price_change()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_supplier_name TEXT;
BEGIN
  IF OLD.cost_price IS DISTINCT FROM NEW.cost_price AND NEW.cost_price IS NOT NULL THEN
    -- Try to resolve supplier name from product_suppliers via supplier_id
    IF NEW.supplier_id IS NOT NULL THEN
      SELECT supplier_name INTO v_supplier_name
      FROM public.product_suppliers
      WHERE id = NEW.supplier_id;
    END IF;

    INSERT INTO public.product_cost_history (product_id, organization_id, supplier_name, cost_price)
    VALUES (NEW.id, NEW.organization_id, v_supplier_name, NEW.cost_price);
  END IF;
  RETURN NEW;
END;
$$;
