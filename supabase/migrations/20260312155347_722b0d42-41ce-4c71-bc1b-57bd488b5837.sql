-- Add unique partial index on stock_movements to prevent duplicate ledger entries on retry
-- Only enforced when reference_type and reference_id are not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_movements_dedup
ON public.stock_movements (organization_id, product_id, reference_type, reference_id, event_type)
WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;