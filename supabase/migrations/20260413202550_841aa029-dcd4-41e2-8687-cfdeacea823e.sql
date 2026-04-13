-- Create payment_disputes table
CREATE TABLE IF NOT EXISTS public.payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_dispute_id TEXT NOT NULL UNIQUE,
  stripe_charge_id TEXT,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'needs_response',
  evidence_due_by TIMESTAMPTZ,
  client_name TEXT,
  client_email TEXT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_disputes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view disputes"
  ON public.payment_disputes FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can update disputes"
  ON public.payment_disputes FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Platform users can view all disputes"
  ON public.payment_disputes FOR SELECT
  USING (public.is_platform_user(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_payment_disputes_updated_at
  BEFORE UPDATE ON public.payment_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_disputes_org
  ON public.payment_disputes(organization_id);

CREATE INDEX IF NOT EXISTS idx_payment_disputes_status
  ON public.payment_disputes(status);

CREATE INDEX IF NOT EXISTS idx_payment_disputes_stripe_id
  ON public.payment_disputes(stripe_dispute_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_disputes;