
-- Create terminal_hardware_requests table
CREATE TABLE IF NOT EXISTS public.terminal_hardware_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL DEFAULT 'additional',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  tracking_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.terminal_hardware_requests ENABLE ROW LEVEL SECURITY;

-- Org members can view their own org's requests
CREATE POLICY "Org members can view terminal requests"
  ON public.terminal_hardware_requests FOR SELECT
  USING (
    public.is_org_member(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

-- Org admins/managers can create requests
CREATE POLICY "Org admins can create terminal requests"
  ON public.terminal_hardware_requests FOR INSERT
  WITH CHECK (
    public.is_org_admin(auth.uid(), organization_id)
    AND requested_by = auth.uid()
  );

-- Platform users can update requests (status, tracking, admin_notes)
CREATE POLICY "Platform users can update terminal requests"
  ON public.terminal_hardware_requests FOR UPDATE
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_terminal_hardware_requests_updated_at
  BEFORE UPDATE ON public.terminal_hardware_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_terminal_hardware_requests_org
  ON public.terminal_hardware_requests(organization_id);

CREATE INDEX IF NOT EXISTS idx_terminal_hardware_requests_status
  ON public.terminal_hardware_requests(status);
