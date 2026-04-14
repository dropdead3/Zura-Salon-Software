ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS afterpay_surcharge_amount INTEGER DEFAULT NULL;