
-- =============================================
-- Payment Method Tracking: Add payment_method to phorest_appointments
-- =============================================
ALTER TABLE public.phorest_appointments 
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- =============================================
-- Cancellation / No-Show Fee Infrastructure
-- =============================================

-- Fee policy configuration per organization
CREATE TABLE IF NOT EXISTS public.cancellation_fee_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('cancellation', 'no_show')),
  fee_type TEXT NOT NULL DEFAULT 'flat' CHECK (fee_type IN ('flat', 'percentage')),
  fee_amount NUMERIC NOT NULL DEFAULT 0,
  min_notice_hours INTEGER DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to_new_clients_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, policy_type)
);

ALTER TABLE public.cancellation_fee_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view fee policies"
  ON public.cancellation_fee_policies FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage fee policies"
  ON public.cancellation_fee_policies FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_cancellation_fee_policies_updated_at
  BEFORE UPDATE ON public.cancellation_fee_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_cancellation_fee_policies_org
  ON public.cancellation_fee_policies(organization_id);

-- Fee charges applied to specific appointments
CREATE TABLE IF NOT EXISTS public.appointment_fee_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.phorest_appointments(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.cancellation_fee_policies(id) ON DELETE SET NULL,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('cancellation', 'no_show')),
  fee_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'charged', 'waived', 'collected')),
  waived_by UUID REFERENCES auth.users(id),
  waived_reason TEXT,
  charged_at TIMESTAMPTZ,
  collected_via TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_fee_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view fee charges"
  ON public.appointment_fee_charges FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage fee charges"
  ON public.appointment_fee_charges FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_appointment_fee_charges_updated_at
  BEFORE UPDATE ON public.appointment_fee_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_appointment_fee_charges_org
  ON public.appointment_fee_charges(organization_id);

CREATE INDEX IF NOT EXISTS idx_appointment_fee_charges_appointment
  ON public.appointment_fee_charges(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_fee_charges_status
  ON public.appointment_fee_charges(status);
