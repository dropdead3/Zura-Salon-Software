
-- ============================================================
-- Appointment Audit Log + Schema Enhancements
-- ============================================================

-- 1. Audit log table
CREATE TABLE IF NOT EXISTS public.appointment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.phorest_appointments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id),
  actor_name TEXT,
  previous_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: org members can read
CREATE POLICY "Org members can view audit logs"
  ON public.appointment_audit_log FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- RLS: authenticated users in org can insert
CREATE POLICY "Org members can insert audit logs"
  ON public.appointment_audit_log FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appt_audit_appointment ON public.appointment_audit_log(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appt_audit_org ON public.appointment_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_appt_audit_created ON public.appointment_audit_log(created_at);

-- 2. Add created_by to phorest_appointments
ALTER TABLE public.phorest_appointments
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 3. Add appointment_id, payment_method, stylist_name to phorest_transaction_items
ALTER TABLE public.phorest_transaction_items
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.phorest_appointments(id),
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS stylist_name TEXT;

-- Index for transaction-to-appointment lookups
CREATE INDEX IF NOT EXISTS idx_txn_items_appointment ON public.phorest_transaction_items(appointment_id);
