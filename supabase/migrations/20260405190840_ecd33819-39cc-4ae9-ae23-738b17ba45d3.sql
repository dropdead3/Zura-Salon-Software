
-- Create level_promotions table for audit trail
CREATE TABLE IF NOT EXISTS public.level_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_level TEXT NOT NULL,
  to_level TEXT NOT NULL,
  promoted_by UUID NOT NULL,
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.level_promotions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view promotions"
  ON public.level_promotions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create promotions"
  ON public.level_promotions FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Index
CREATE INDEX IF NOT EXISTS idx_level_promotions_org ON public.level_promotions(organization_id);
CREATE INDEX IF NOT EXISTS idx_level_promotions_user ON public.level_promotions(user_id);
