
-- Create location_inventory_leads table
CREATE TABLE IF NOT EXISTS public.location_inventory_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id)
);

-- Enable RLS
ALTER TABLE public.location_inventory_leads ENABLE ROW LEVEL SECURITY;

-- Org members can view
CREATE POLICY "Org members can view inventory leads"
  ON public.location_inventory_leads FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Admins can insert
CREATE POLICY "Admins can insert inventory leads"
  ON public.location_inventory_leads FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Admins can update
CREATE POLICY "Admins can update inventory leads"
  ON public.location_inventory_leads FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Admins can delete
CREATE POLICY "Admins can delete inventory leads"
  ON public.location_inventory_leads FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Index for org lookups
CREATE INDEX IF NOT EXISTS idx_location_inventory_leads_org
  ON public.location_inventory_leads(organization_id);
