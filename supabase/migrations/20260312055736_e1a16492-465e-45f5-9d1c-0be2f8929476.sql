
-- Add par_level to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS par_level INTEGER;

-- Add moq to product_suppliers
ALTER TABLE public.product_suppliers ADD COLUMN IF NOT EXISTS moq INTEGER NOT NULL DEFAULT 1;

-- Add auto-reorder fields to inventory_alert_settings
ALTER TABLE public.inventory_alert_settings ADD COLUMN IF NOT EXISTS auto_reorder_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.inventory_alert_settings ADD COLUMN IF NOT EXISTS auto_reorder_mode TEXT NOT NULL DEFAULT 'to_par';
ALTER TABLE public.inventory_alert_settings ADD COLUMN IF NOT EXISTS max_auto_reorder_value NUMERIC;

-- Add supplier_confirmed_at to purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS supplier_confirmed_at TIMESTAMPTZ;
