-- Add product_type column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'Products';

-- Backfill existing rows based on name patterns
UPDATE public.products SET product_type = 'Extensions'
WHERE product_type = 'Products'
  AND name ~* 'extension|weft|tape.?in|hand.?tied|keratin.?bond|fusion|beaded.?row|i.?tip|k.?tip|u.?tip|nano.?ring';

UPDATE public.products SET product_type = 'Gift Cards'
WHERE product_type = 'Products'
  AND name ~* 'gift.?card|voucher|gift.?cert|gift.?certificate';

UPDATE public.products SET product_type = 'Merch'
WHERE product_type = 'Products'
  AND name ~* 't.?shirt|\ytee\y|\yhat\y|\ycap\y|beanie|hoodie|sweatshirt|tote|\ybag\y|sticker|patch|\ypin\y|keychain|apparel|merch|branded';

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);