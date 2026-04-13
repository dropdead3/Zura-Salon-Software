-- Add client_id column to payment_disputes
ALTER TABLE public.payment_disputes
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_disputes_client_id
ON public.payment_disputes(client_id);