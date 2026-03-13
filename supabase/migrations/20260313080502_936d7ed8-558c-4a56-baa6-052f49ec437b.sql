
-- Create backroom_compliance_log table
CREATE TABLE IF NOT EXISTS public.backroom_compliance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  location_id TEXT,
  staff_user_id UUID,
  staff_name TEXT,
  service_name TEXT,
  has_mix_session BOOLEAN NOT NULL DEFAULT false,
  mix_session_id UUID,
  has_reweigh BOOLEAN NOT NULL DEFAULT false,
  is_manual_override BOOLEAN NOT NULL DEFAULT false,
  compliance_status TEXT NOT NULL DEFAULT 'missing',
  notes TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(appointment_id)
);

-- Enable RLS
ALTER TABLE public.backroom_compliance_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view compliance log"
  ON public.backroom_compliance_log FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert compliance log"
  ON public.backroom_compliance_log FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update compliance log"
  ON public.backroom_compliance_log FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete compliance log"
  ON public.backroom_compliance_log FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_log_org_date
  ON public.backroom_compliance_log(organization_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_compliance_log_staff
  ON public.backroom_compliance_log(organization_id, staff_user_id, appointment_date);
