-- Afterpay org-level toggle
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS afterpay_enabled boolean NOT NULL DEFAULT false;

-- Track split payments and payment links on appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS split_payment_terminal_intent_id text,
  ADD COLUMN IF NOT EXISTS split_payment_link_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_link_url text,
  ADD COLUMN IF NOT EXISTS payment_link_sent_at timestamptz;