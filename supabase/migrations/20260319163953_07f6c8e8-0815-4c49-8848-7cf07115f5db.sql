
-- Add audit schedule columns to inventory_alert_settings
ALTER TABLE public.inventory_alert_settings
  ADD COLUMN IF NOT EXISTS audit_frequency TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS audit_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS audit_reminder_days_before INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS audit_notify_roles TEXT[] NOT NULL DEFAULT '{inventory_manager,manager}';

-- Create inventory_audit_schedule table
CREATE TABLE IF NOT EXISTS public.inventory_audit_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  count_session_id UUID REFERENCES public.count_sessions(id),
  reminder_sent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_audit_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view audit schedule"
  ON public.inventory_audit_schedule FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create audit schedule"
  ON public.inventory_audit_schedule FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update audit schedule"
  ON public.inventory_audit_schedule FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete audit schedule"
  ON public.inventory_audit_schedule FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_inventory_audit_schedule_updated_at
  BEFORE UPDATE ON public.inventory_audit_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_schedule_org ON public.inventory_audit_schedule(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_schedule_due_date ON public.inventory_audit_schedule(due_date);
CREATE INDEX IF NOT EXISTS idx_audit_schedule_status ON public.inventory_audit_schedule(status);
