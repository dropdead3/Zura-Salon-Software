
-- =============================================================
-- Phase 3: Service Allowance Billing
-- =============================================================

-- 1. service_allowance_policies
CREATE TABLE IF NOT EXISTS public.service_allowance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  included_allowance_qty NUMERIC NOT NULL DEFAULT 0,
  allowance_unit TEXT NOT NULL DEFAULT 'g',
  overage_rate NUMERIC NOT NULL DEFAULT 0,
  overage_rate_type TEXT NOT NULL DEFAULT 'per_unit',
  overage_cap NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, service_id)
);

ALTER TABLE public.service_allowance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view allowance policies"
  ON public.service_allowance_policies FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage allowance policies"
  ON public.service_allowance_policies FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_service_allowance_policies_updated_at
  BEFORE UPDATE ON public.service_allowance_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE INDEX IF NOT EXISTS idx_allowance_policies_service
  ON public.service_allowance_policies(service_id);

CREATE INDEX IF NOT EXISTS idx_allowance_policies_org
  ON public.service_allowance_policies(organization_id);

-- 2. checkout_usage_charges
CREATE TABLE IF NOT EXISTS public.checkout_usage_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  mix_session_id UUID NOT NULL REFERENCES public.mix_sessions(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.service_allowance_policies(id) ON DELETE SET NULL,
  service_name TEXT,
  included_allowance_qty NUMERIC NOT NULL,
  actual_usage_qty NUMERIC NOT NULL,
  overage_qty NUMERIC NOT NULL,
  overage_rate NUMERIC NOT NULL,
  charge_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  waived_by UUID REFERENCES auth.users(id),
  waived_reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_usage_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view usage charges"
  ON public.checkout_usage_charges FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert usage charges"
  ON public.checkout_usage_charges FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can update usage charges"
  ON public.checkout_usage_charges FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_checkout_usage_charges_updated_at
  BEFORE UPDATE ON public.checkout_usage_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE INDEX IF NOT EXISTS idx_checkout_charges_appointment
  ON public.checkout_usage_charges(appointment_id);

CREATE INDEX IF NOT EXISTS idx_checkout_charges_session
  ON public.checkout_usage_charges(mix_session_id);

-- 3. allowance_override_log
CREATE TABLE IF NOT EXISTS public.allowance_override_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  charge_id UUID NOT NULL REFERENCES public.checkout_usage_charges(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_amount NUMERIC,
  new_amount NUMERIC,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.allowance_override_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view override logs"
  ON public.allowance_override_log FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert override logs"
  ON public.allowance_override_log FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_override_log_charge
  ON public.allowance_override_log(charge_id);
