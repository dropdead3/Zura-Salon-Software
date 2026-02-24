
-- Create appointment_service_assignments table
CREATE TABLE IF NOT EXISTS public.appointment_service_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.phorest_appointments(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  assigned_user_id UUID NOT NULL,
  assigned_staff_name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Unique constraint: one override per service per appointment
ALTER TABLE public.appointment_service_assignments
  ADD CONSTRAINT uq_appointment_service_assignments UNIQUE (appointment_id, service_name);

-- Enable RLS
ALTER TABLE public.appointment_service_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view service assignments"
  ON public.appointment_service_assignments FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create service assignments"
  ON public.appointment_service_assignments FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update service assignments"
  ON public.appointment_service_assignments FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete service assignments"
  ON public.appointment_service_assignments FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_assignments_appointment
  ON public.appointment_service_assignments(appointment_id);

CREATE INDEX IF NOT EXISTS idx_service_assignments_org
  ON public.appointment_service_assignments(organization_id);
