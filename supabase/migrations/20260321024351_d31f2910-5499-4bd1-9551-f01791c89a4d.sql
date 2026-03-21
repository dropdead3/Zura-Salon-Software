ALTER TABLE public.phorest_clients ADD COLUMN IF NOT EXISTS medical_alerts text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS medical_alerts text;