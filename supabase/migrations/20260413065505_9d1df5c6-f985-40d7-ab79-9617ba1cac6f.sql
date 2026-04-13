
-- Add require_card_on_file to services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS require_card_on_file BOOLEAN NOT NULL DEFAULT false;

-- Add card-on-file and cancellation fee tracking to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS card_on_file_id UUID REFERENCES public.client_cards_on_file(id),
  ADD COLUMN IF NOT EXISTS cancellation_fee_charged NUMERIC,
  ADD COLUMN IF NOT EXISTS cancellation_fee_status TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_fee_stripe_payment_id TEXT;
