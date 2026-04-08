
-- Fix inflated tip_amount in phorest_appointments.
-- Phorest duplicates the same tip on every line item in a checkout.
-- The sync was summing these, inflating tips by N× (where N = number of items).
-- This migration corrects existing data by using the per-item tip value
-- from phorest_transaction_items (all items share the same tip, so we take MAX).

UPDATE phorest_appointments a
SET tip_amount = corrected.correct_tip
FROM (
  SELECT 
    ti.phorest_staff_id,
    ti.phorest_client_id,
    ti.transaction_date::date AS apt_date,
    MAX(ti.tip_amount) AS correct_tip
  FROM phorest_transaction_items ti
  WHERE ti.tip_amount > 0
  GROUP BY ti.phorest_staff_id, ti.phorest_client_id, ti.transaction_date::date
) corrected
WHERE a.phorest_staff_id = corrected.phorest_staff_id
  AND a.phorest_client_id = corrected.phorest_client_id
  AND a.appointment_date = corrected.apt_date
  AND a.tip_amount IS NOT NULL
  AND a.tip_amount != corrected.correct_tip;
