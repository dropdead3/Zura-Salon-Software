
-- Add evidence_submitted_at to payment_disputes
ALTER TABLE public.payment_disputes
  ADD COLUMN IF NOT EXISTS evidence_submitted_at TIMESTAMPTZ;

-- Create fraud_warnings table
CREATE TABLE IF NOT EXISTS public.fraud_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_charge_id TEXT NOT NULL,
  stripe_warning_id TEXT NOT NULL UNIQUE,
  fraud_type TEXT NOT NULL DEFAULT 'unknown',
  actionable BOOLEAN NOT NULL DEFAULT true,
  resolved_at TIMESTAMPTZ,
  resolved_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fraud_warnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view fraud warnings"
  ON public.fraud_warnings FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create fraud warnings"
  ON public.fraud_warnings FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update fraud warnings"
  ON public.fraud_warnings FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete fraud warnings"
  ON public.fraud_warnings FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_fraud_warnings_updated_at
  BEFORE UPDATE ON public.fraud_warnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fraud_warnings_org ON public.fraud_warnings(organization_id);
CREATE INDEX IF NOT EXISTS idx_fraud_warnings_charge ON public.fraud_warnings(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_fraud_warnings_actionable ON public.fraud_warnings(organization_id, actionable) WHERE resolved_at IS NULL;
