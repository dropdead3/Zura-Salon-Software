
-- Add discount columns to phorest_appointments
ALTER TABLE public.phorest_appointments
  ADD COLUMN IF NOT EXISTS discount_type TEXT,
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_price NUMERIC,
  ADD COLUMN IF NOT EXISTS discount_reason TEXT,
  ADD COLUMN IF NOT EXISTS discount_id UUID;

-- Create service_discounts configurator table
CREATE TABLE IF NOT EXISTS public.service_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  applies_to TEXT DEFAULT 'all_services',
  applicable_service_ids UUID[],
  applicable_categories TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK from phorest_appointments.discount_id to service_discounts
ALTER TABLE public.phorest_appointments
  ADD CONSTRAINT fk_phorest_appointments_discount
  FOREIGN KEY (discount_id) REFERENCES public.service_discounts(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.service_discounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_discounts
CREATE POLICY "Org members can view discounts"
  ON public.service_discounts FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create discounts"
  ON public.service_discounts FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update discounts"
  ON public.service_discounts FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete discounts"
  ON public.service_discounts FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_discounts_org ON public.service_discounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_discounts_active ON public.service_discounts(organization_id, is_active);

-- Updated_at trigger
CREATE TRIGGER update_service_discounts_updated_at
  BEFORE UPDATE ON public.service_discounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
