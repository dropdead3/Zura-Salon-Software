ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS afterpay_surcharge_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS afterpay_surcharge_rate NUMERIC NOT NULL DEFAULT 0.06;