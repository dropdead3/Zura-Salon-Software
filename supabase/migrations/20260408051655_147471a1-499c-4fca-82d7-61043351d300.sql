
-- Add missing indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_transaction_items_org ON public.transaction_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_date_zura ON public.transaction_items(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transaction_items_location_zura ON public.transaction_items(location_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_staff_zura ON public.transaction_items(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_type_zura ON public.transaction_items(item_type);
CREATE INDEX IF NOT EXISTS idx_transaction_items_appointment_zura ON public.transaction_items(appointment_id);

-- Ensure RLS is enabled
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Create policies if not exist (use DO block to handle existing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transaction_items' AND policyname = 'Org members can view transaction items') THEN
    CREATE POLICY "Org members can view transaction items"
      ON public.transaction_items FOR SELECT
      USING (public.is_org_member(auth.uid(), organization_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transaction_items' AND policyname = 'Org admins can create transaction items') THEN
    CREATE POLICY "Org admins can create transaction items"
      ON public.transaction_items FOR INSERT
      WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transaction_items' AND policyname = 'Org admins can update transaction items') THEN
    CREATE POLICY "Org admins can update transaction items"
      ON public.transaction_items FOR UPDATE
      USING (public.is_org_admin(auth.uid(), organization_id))
      WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transaction_items' AND policyname = 'Org admins can delete transaction items') THEN
    CREATE POLICY "Org admins can delete transaction items"
      ON public.transaction_items FOR DELETE
      USING (public.is_org_admin(auth.uid(), organization_id));
  END IF;
END $$;

-- Drop existing trigger if any, recreate
DROP TRIGGER IF EXISTS update_transaction_items_updated_at ON public.transaction_items;
CREATE TRIGGER update_transaction_items_updated_at
  BEFORE UPDATE ON public.transaction_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Union view: normalized columns from both sources
CREATE OR REPLACE VIEW public.v_all_transaction_items AS
SELECT
  p.id,
  p.transaction_id,
  p.stylist_user_id AS staff_user_id,
  NULL::UUID AS client_id,
  p.phorest_client_id AS external_client_id,
  p.client_name,
  p.location_id,
  p.branch_name,
  p.transaction_date,
  p.item_type,
  p.item_name,
  p.item_category,
  p.quantity,
  p.unit_price,
  p.discount,
  p.total_amount,
  p.sale_classification,
  p.appointment_id,
  p.payment_method,
  p.stylist_name AS staff_name,
  p.promotion_id,
  p.tax_amount,
  p.tip_amount,
  'phorest'::TEXT AS source,
  p.created_at
FROM public.phorest_transaction_items p

UNION ALL

SELECT
  t.id,
  t.transaction_id,
  t.staff_user_id,
  t.client_id,
  t.external_id AS external_client_id,
  t.client_name,
  t.location_id,
  t.branch_name,
  t.transaction_date,
  t.item_type,
  t.item_name,
  t.item_category,
  t.quantity,
  t.unit_price,
  t.discount,
  t.total_amount,
  t.sale_classification,
  t.appointment_id,
  t.payment_method,
  t.staff_name,
  t.promotion_id,
  t.tax_amount,
  t.tip_amount,
  COALESCE(t.import_source, 'zura')::TEXT AS source,
  t.created_at
FROM public.transaction_items t;
