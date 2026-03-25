ALTER TABLE public.phorest_services ADD COLUMN IF NOT EXISTS is_chemical_service boolean NOT NULL DEFAULT false;

-- Backfill: any service that already has container_types set should be marked as chemical
UPDATE public.phorest_services SET is_chemical_service = true WHERE container_types IS NOT NULL AND array_length(container_types, 1) > 0;