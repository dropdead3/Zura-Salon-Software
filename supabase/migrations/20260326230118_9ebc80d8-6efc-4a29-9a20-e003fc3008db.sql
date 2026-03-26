
CREATE TYPE public.color_type AS ENUM ('permanent', 'demi_permanent', 'semi_permanent');

ALTER TABLE public.supply_library_products
  ADD COLUMN color_type public.color_type;

ALTER TABLE public.products
  ADD COLUMN color_type public.color_type;
