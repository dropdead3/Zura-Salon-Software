
-- Add dead stock alert configuration to inventory_alert_settings
ALTER TABLE public.inventory_alert_settings 
  ADD COLUMN IF NOT EXISTS dead_stock_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dead_stock_days INTEGER NOT NULL DEFAULT 90;

-- Add avg_delivery_days to product_suppliers for lead-time tracking  
ALTER TABLE public.product_suppliers
  ADD COLUMN IF NOT EXISTS avg_delivery_days NUMERIC,
  ADD COLUMN IF NOT EXISTS delivery_count INTEGER NOT NULL DEFAULT 0;
