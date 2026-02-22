
-- Create draft_bookings table
CREATE TABLE IF NOT EXISTS public.draft_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  appointment_date DATE,
  start_time TIME,
  client_id UUID,
  client_name TEXT,
  staff_user_id UUID,
  staff_name TEXT,
  selected_services JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  step_reached TEXT,
  is_redo BOOLEAN NOT NULL DEFAULT false,
  redo_metadata JSONB,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.draft_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view draft bookings"
  ON public.draft_bookings FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create draft bookings"
  ON public.draft_bookings FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update draft bookings"
  ON public.draft_bookings FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can delete draft bookings"
  ON public.draft_bookings FOR DELETE
  USING (public.is_org_member(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_draft_bookings_updated_at
  BEFORE UPDATE ON public.draft_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_draft_bookings_org ON public.draft_bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_draft_bookings_created_by ON public.draft_bookings(created_by);
CREATE INDEX IF NOT EXISTS idx_draft_bookings_expires_at ON public.draft_bookings(expires_at);
