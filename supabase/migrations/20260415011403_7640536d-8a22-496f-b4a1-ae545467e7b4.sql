-- Recreate v_all_transaction_items with backward-compatible aliases
DROP VIEW IF EXISTS public.v_all_transaction_items;

CREATE OR REPLACE VIEW public.v_all_transaction_items AS
SELECT
  p.id,
  p.transaction_id,
  p.stylist_user_id AS staff_user_id,
  p.stylist_user_id AS stylist_user_id,
  NULL::UUID AS client_id,
  p.phorest_client_id AS external_client_id,
  p.phorest_client_id,
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
  p.stylist_name,
  p.phorest_staff_id,
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
  t.staff_user_id AS stylist_user_id,
  t.client_id,
  t.external_id AS external_client_id,
  t.external_id AS phorest_client_id,
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
  t.staff_name AS stylist_name,
  NULL::TEXT AS phorest_staff_id,
  t.promotion_id,
  t.tax_amount,
  t.tip_amount,
  COALESCE(t.import_source, 'zura')::TEXT AS source,
  t.created_at
FROM public.transaction_items t;

ALTER VIEW public.v_all_transaction_items SET (security_invoker = true);