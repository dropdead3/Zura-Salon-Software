
-- Table: per-org procurement budget targets
CREATE TABLE IF NOT EXISTS public.procurement_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  monthly_budget NUMERIC NOT NULL DEFAULT 0,
  alert_threshold_pct INTEGER NOT NULL DEFAULT 80,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (organization_id)
);

ALTER TABLE public.procurement_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view procurement budgets"
  ON public.procurement_budgets FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert procurement budgets"
  ON public.procurement_budgets FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update procurement budgets"
  ON public.procurement_budgets FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_procurement_budgets_org
  ON public.procurement_budgets(organization_id);
