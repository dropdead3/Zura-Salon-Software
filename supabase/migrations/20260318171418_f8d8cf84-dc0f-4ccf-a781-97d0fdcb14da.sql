
-- Sequence for PO numbers
CREATE SEQUENCE IF NOT EXISTS public.po_number_seq START WITH 1 INCREMENT BY 1;

-- Trigger function to auto-generate PO numbers
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(nextval('public.po_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to purchase_orders
DROP TRIGGER IF EXISTS trg_generate_po_number ON public.purchase_orders;
CREATE TRIGGER trg_generate_po_number
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_po_number();

-- Add delivery tracking columns
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS supplier_confirmed_delivery_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_followup_sent_at TIMESTAMPTZ;
