-- Enums
CREATE TYPE public.financed_project_status AS ENUM ('pending_payment', 'active', 'completed', 'defaulted', 'cancelled');
CREATE TYPE public.financed_ledger_entry_type AS ENUM ('repayment', 'revenue_lift_recorded', 'adjustment');

-- Financed Projects
CREATE TABLE IF NOT EXISTS public.financed_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.expansion_opportunities(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT,
  stripe_subscription_id TEXT,
  funded_amount NUMERIC NOT NULL DEFAULT 0,
  predicted_annual_lift NUMERIC NOT NULL DEFAULT 0,
  predicted_break_even_months NUMERIC NOT NULL DEFAULT 0,
  roe_at_funding NUMERIC NOT NULL DEFAULT 0,
  confidence_at_funding TEXT NOT NULL DEFAULT 'medium',
  risk_level_at_funding TEXT NOT NULL DEFAULT 'moderate',
  status public.financed_project_status NOT NULL DEFAULT 'pending_payment',
  repayment_total NUMERIC NOT NULL DEFAULT 0,
  repayment_remaining NUMERIC NOT NULL DEFAULT 0,
  realized_revenue_lift NUMERIC NOT NULL DEFAULT 0,
  variance_pct NUMERIC,
  funded_at TIMESTAMPTZ,
  target_completion_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financed_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view financed projects"
  ON public.financed_projects FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create financed projects"
  ON public.financed_projects FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update financed projects"
  ON public.financed_projects FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete financed projects"
  ON public.financed_projects FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_financed_projects_updated_at
  BEFORE UPDATE ON public.financed_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_financed_projects_org ON public.financed_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_financed_projects_opportunity ON public.financed_projects(opportunity_id);

-- Financed Project Ledger
CREATE TABLE IF NOT EXISTS public.financed_project_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financed_project_id UUID NOT NULL REFERENCES public.financed_projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_type public.financed_ledger_entry_type NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financed_project_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view ledger"
  ON public.financed_project_ledger FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create ledger entries"
  ON public.financed_project_ledger FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update ledger entries"
  ON public.financed_project_ledger FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete ledger entries"
  ON public.financed_project_ledger FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_financed_ledger_project ON public.financed_project_ledger(financed_project_id);
CREATE INDEX IF NOT EXISTS idx_financed_ledger_org ON public.financed_project_ledger(organization_id);