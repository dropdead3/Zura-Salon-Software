-- One-time backfill: reconcile past appointments against persisted POS transactions.
-- Heals drift caused by the prior payload-driven reconciler that silently
-- skipped updates when Phorest returned varying field shapes across endpoints.
UPDATE public.phorest_appointments a
   SET status = 'completed',
       updated_at = now()
  FROM (
    SELECT DISTINCT phorest_client_id, transaction_date
      FROM public.phorest_transaction_items
     WHERE transaction_date < CURRENT_DATE
       AND phorest_client_id IS NOT NULL
  ) t
 WHERE a.phorest_client_id = t.phorest_client_id
   AND a.appointment_date  = t.transaction_date
   AND a.status IN ('booked', 'confirmed', 'checked_in')
   AND COALESCE(a.is_archived, false) = false
   AND a.deleted_at IS NULL;