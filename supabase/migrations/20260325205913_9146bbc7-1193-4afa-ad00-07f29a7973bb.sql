ALTER TABLE public.services
  ALTER COLUMN is_chemical_service DROP NOT NULL,
  ALTER COLUMN is_chemical_service SET DEFAULT NULL;

UPDATE public.services
  SET is_chemical_service = NULL
  WHERE is_chemical_service = false;