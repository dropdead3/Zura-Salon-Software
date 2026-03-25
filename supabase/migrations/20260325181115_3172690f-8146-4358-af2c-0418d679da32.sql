
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_chemical_service boolean NOT NULL DEFAULT false;

-- Backfill: services with container_types set
UPDATE public.services SET is_chemical_service = true
  WHERE container_types IS NOT NULL AND array_length(container_types, 1) > 0;

-- Backfill: services already tracked in backroom
UPDATE public.services SET is_chemical_service = true
  WHERE is_backroom_tracked = true;
