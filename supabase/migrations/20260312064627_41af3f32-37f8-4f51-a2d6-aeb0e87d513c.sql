ALTER TABLE public.products ADD COLUMN IF NOT EXISTS expires_at DATE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS expiry_alert_days INTEGER DEFAULT 30;