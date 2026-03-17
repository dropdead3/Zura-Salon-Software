ALTER TABLE public.supply_library_products 
ADD COLUMN IF NOT EXISTS default_markup_pct numeric DEFAULT 0;