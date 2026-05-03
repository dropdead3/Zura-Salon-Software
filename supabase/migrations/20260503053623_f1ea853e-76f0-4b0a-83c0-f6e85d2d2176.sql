ALTER TABLE public.reputation_subscriptions
  ADD COLUMN IF NOT EXISTS retention_coupon_applied_at TIMESTAMPTZ;