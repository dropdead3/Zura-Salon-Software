
-- Create level_promotion_criteria table
CREATE TABLE IF NOT EXISTS public.level_promotion_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stylist_level_id UUID NOT NULL REFERENCES public.stylist_levels(id) ON DELETE CASCADE,
  revenue_enabled BOOLEAN NOT NULL DEFAULT false,
  revenue_threshold NUMERIC NOT NULL DEFAULT 0,
  retail_enabled BOOLEAN NOT NULL DEFAULT false,
  retail_pct_threshold NUMERIC NOT NULL DEFAULT 0,
  rebooking_enabled BOOLEAN NOT NULL DEFAULT false,
  rebooking_pct_threshold NUMERIC NOT NULL DEFAULT 0,
  avg_ticket_enabled BOOLEAN NOT NULL DEFAULT false,
  avg_ticket_threshold NUMERIC NOT NULL DEFAULT 0,
  tenure_enabled BOOLEAN NOT NULL DEFAULT false,
  tenure_days INTEGER NOT NULL DEFAULT 0,
  revenue_weight INTEGER NOT NULL DEFAULT 0,
  retail_weight INTEGER NOT NULL DEFAULT 0,
  rebooking_weight INTEGER NOT NULL DEFAULT 0,
  avg_ticket_weight INTEGER NOT NULL DEFAULT 0,
  evaluation_window_days INTEGER NOT NULL DEFAULT 30,
  requires_manual_approval BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, stylist_level_id)
);

-- Enable RLS
ALTER TABLE public.level_promotion_criteria ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view promotion criteria"
  ON public.level_promotion_criteria FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create promotion criteria"
  ON public.level_promotion_criteria FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update promotion criteria"
  ON public.level_promotion_criteria FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete promotion criteria"
  ON public.level_promotion_criteria FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_level_promotion_criteria_updated_at
  BEFORE UPDATE ON public.level_promotion_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_level_promotion_criteria_org
  ON public.level_promotion_criteria(organization_id);

CREATE INDEX IF NOT EXISTS idx_level_promotion_criteria_level
  ON public.level_promotion_criteria(stylist_level_id);
