ALTER TABLE public.capital_funding_opportunities 
ADD COLUMN IF NOT EXISTS stripe_offer_id TEXT,
ADD COLUMN IF NOT EXISTS provider_offer_details JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_capital_opps_stripe_offer_id 
ON public.capital_funding_opportunities (stripe_offer_id) 
WHERE stripe_offer_id IS NOT NULL;