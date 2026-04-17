
CREATE TABLE IF NOT EXISTS public.rebook_decline_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  appointment_id UUID,
  client_id UUID,
  staff_id UUID,
  reason_code TEXT NOT NULL,
  reason_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.rebook_decline_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view decline reasons"
  ON public.rebook_decline_reasons FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create decline reasons"
  ON public.rebook_decline_reasons FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can update decline reasons"
  ON public.rebook_decline_reasons FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete decline reasons"
  ON public.rebook_decline_reasons FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_rebook_decline_reasons_org_created
  ON public.rebook_decline_reasons(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rebook_decline_reasons_location
  ON public.rebook_decline_reasons(location_id);

CREATE INDEX IF NOT EXISTS idx_rebook_decline_reasons_appointment
  ON public.rebook_decline_reasons(appointment_id);

CREATE INDEX IF NOT EXISTS idx_rebook_decline_reasons_reason_code
  ON public.rebook_decline_reasons(reason_code);
