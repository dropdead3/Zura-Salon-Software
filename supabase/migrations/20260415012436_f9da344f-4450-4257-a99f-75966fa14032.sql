
CREATE OR REPLACE VIEW public.v_all_sales_transactions AS

-- Zura-native transaction items (preferred)
SELECT
  ti.id,
  ti.transaction_id AS phorest_transaction_id,
  ti.staff_user_id AS stylist_user_id,
  CAST(NULL AS text) AS phorest_staff_id,
  ti.location_id,
  ti.branch_name,
  ti.transaction_date,
  CAST(NULL AS time) AS transaction_time,
  ti.client_name,
  CAST(NULL AS text) AS client_phone,
  ti.item_type,
  ti.item_name,
  ti.item_category,
  ti.quantity,
  ti.unit_price,
  ti.discount AS discount_amount,
  ti.tax_amount,
  ti.total_amount,
  ti.payment_method,
  ti.tip_amount,
  ti.created_at,
  ti.updated_at,
  'zura' AS _source
FROM public.transaction_items ti

UNION ALL

-- Phorest-synced sales transactions (only if not duplicated in transaction_items)
SELECT
  pst.id,
  pst.phorest_transaction_id,
  pst.stylist_user_id,
  pst.phorest_staff_id,
  pst.location_id,
  pst.branch_name,
  pst.transaction_date,
  pst.transaction_time,
  pst.client_name,
  pst.client_phone,
  pst.item_type,
  pst.item_name,
  pst.item_category,
  pst.quantity,
  pst.unit_price,
  pst.discount_amount,
  pst.tax_amount,
  pst.total_amount,
  pst.payment_method,
  pst.tip_amount,
  pst.created_at,
  pst.updated_at,
  'phorest' AS _source
FROM public.phorest_sales_transactions pst
WHERE NOT EXISTS (
  SELECT 1 FROM public.transaction_items ti
  WHERE ti.transaction_id = pst.phorest_transaction_id
    AND ti.item_name = pst.item_name
);

GRANT SELECT ON public.v_all_sales_transactions TO anon, authenticated;
