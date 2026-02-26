
-- Cancellation Waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.phorest_clients(id),
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  service_name TEXT,
  preferred_stylist_id UUID,
  preferred_date_start DATE NOT NULL,
  preferred_date_end DATE,
  preferred_time_start TIME,
  preferred_time_end TIME,
  status TEXT NOT NULL DEFAULT 'waiting',
  priority INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  offered_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org members can view waitlist"
  ON public.waitlist_entries FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create waitlist entries"
  ON public.waitlist_entries FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update waitlist entries"
  ON public.waitlist_entries FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete waitlist entries"
  ON public.waitlist_entries FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_waitlist_entries_updated_at
  BEFORE UPDATE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_org
  ON public.waitlist_entries(organization_id);

CREATE INDEX IF NOT EXISTS idx_waitlist_entries_status
  ON public.waitlist_entries(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_waitlist_entries_dates
  ON public.waitlist_entries(preferred_date_start, preferred_date_end);
