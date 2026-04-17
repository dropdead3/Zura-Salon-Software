-- Create client_communications table for logging outbound SMS/calls
CREATE TABLE IF NOT EXISTS public.client_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  appointment_id UUID,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'call', 'email')),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  to_phone TEXT,
  from_phone TEXT,
  body TEXT,
  template_key TEXT,
  twilio_sid TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view client communications"
  ON public.client_communications FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert client communications"
  ON public.client_communications FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can update client communications"
  ON public.client_communications FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete client communications"
  ON public.client_communications FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_client_communications_org_created
  ON public.client_communications(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_communications_client
  ON public.client_communications(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_communications_appointment
  ON public.client_communications(appointment_id);