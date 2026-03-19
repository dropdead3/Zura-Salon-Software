
-- Add new waste category enum values
ALTER TYPE public.waste_category ADD VALUE IF NOT EXISTS 'wrong_mix';
ALTER TYPE public.waste_category ADD VALUE IF NOT EXISTS 'client_refusal';

-- Add require_po_approval to inventory_alert_settings
ALTER TABLE public.inventory_alert_settings ADD COLUMN IF NOT EXISTS require_po_approval boolean NOT NULL DEFAULT true;

-- Create shared_formulas table
CREATE TABLE IF NOT EXISTS public.shared_formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  formula_history_id UUID NOT NULL REFERENCES public.client_formula_history(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  shared_with UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(formula_history_id, shared_with)
);

-- Enable RLS
ALTER TABLE public.shared_formulas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view shared formulas"
  ON public.shared_formulas FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can share formulas"
  ON public.shared_formulas FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND auth.uid() = shared_by);

CREATE POLICY "Sharers can delete their shared formulas"
  ON public.shared_formulas FOR DELETE
  USING (auth.uid() = shared_by);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shared_formulas_org ON public.shared_formulas(organization_id);
CREATE INDEX IF NOT EXISTS idx_shared_formulas_shared_with ON public.shared_formulas(shared_with);
CREATE INDEX IF NOT EXISTS idx_shared_formulas_client ON public.shared_formulas(client_id);
