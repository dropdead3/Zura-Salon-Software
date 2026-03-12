-- Add clearance workflow columns to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS clearance_status TEXT,
ADD COLUMN IF NOT EXISTS clearance_discount_pct INTEGER,
ADD COLUMN IF NOT EXISTS clearance_marked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_retail_price NUMERIC;

-- Add items_received_count to purchase_orders for fill rate tracking
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS items_received_count INTEGER;