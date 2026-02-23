
ALTER TABLE public.phorest_transaction_items
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_phorest_transaction_items_promotion
  ON public.phorest_transaction_items(promotion_id);
