ALTER TABLE public.stylist_levels
  ADD COLUMN hourly_wage_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN hourly_wage numeric DEFAULT null;