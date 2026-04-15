-- Create payment_risk_scores table
CREATE TABLE IF NOT EXISTS public.payment_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_charge_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  risk_score INTEGER,
  risk_level TEXT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  amount INTEGER,
  currency TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_risk_scores ENABLE ROW LEVEL SECURITY;

-- Org members can read
CREATE POLICY "Org members can view risk scores"
  ON public.payment_risk_scores FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_risk_scores_org
  ON public.payment_risk_scores(organization_id);

CREATE INDEX IF NOT EXISTS idx_payment_risk_scores_risk_level
  ON public.payment_risk_scores(risk_level);

CREATE INDEX IF NOT EXISTS idx_payment_risk_scores_created
  ON public.payment_risk_scores(created_at DESC);