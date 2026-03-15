
-- Create backroom_location_entitlements table
CREATE TABLE IF NOT EXISTS public.backroom_location_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL DEFAULT 'starter',
  scale_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  trial_end_date TIMESTAMPTZ,
  billing_interval TEXT DEFAULT 'monthly',
  stripe_subscription_id TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, location_id)
);

-- Enable RLS
ALTER TABLE public.backroom_location_entitlements ENABLE ROW LEVEL SECURITY;

-- Platform users can manage all rows
CREATE POLICY "Platform users manage location entitlements"
  ON public.backroom_location_entitlements FOR ALL
  USING (public.is_platform_user(auth.uid()));

-- Org members can read their own org's entitlements
CREATE POLICY "Org members read own entitlements"
  ON public.backroom_location_entitlements FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- Org admins can manage their own org's entitlements
CREATE POLICY "Org admins manage own entitlements"
  ON public.backroom_location_entitlements FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_backroom_location_entitlements_updated_at
  BEFORE UPDATE ON public.backroom_location_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backroom_loc_ent_org
  ON public.backroom_location_entitlements(organization_id);

CREATE INDEX IF NOT EXISTS idx_backroom_loc_ent_location
  ON public.backroom_location_entitlements(location_id);
