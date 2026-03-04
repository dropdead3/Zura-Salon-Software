
-- Create meeting_type enum
CREATE TYPE public.meeting_type AS ENUM ('one_on_one', 'interview', 'manager_meeting', 'training', 'other');

-- Create meeting_mode enum
CREATE TYPE public.meeting_mode AS ENUM ('in_person', 'video', 'hybrid');

-- Create meeting_status enum
CREATE TYPE public.meeting_status AS ENUM ('scheduled', 'cancelled', 'completed');

-- Create rsvp_status enum
CREATE TYPE public.rsvp_status AS ENUM ('pending', 'accepted', 'declined');

-- Create admin_meetings table
CREATE TABLE IF NOT EXISTS public.admin_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  organizer_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  meeting_type public.meeting_type NOT NULL DEFAULT 'other',
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  meeting_mode public.meeting_mode NOT NULL DEFAULT 'in_person',
  video_link TEXT,
  notes TEXT,
  status public.meeting_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view meetings"
  ON public.admin_meetings FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create meetings"
  ON public.admin_meetings FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can update meetings"
  ON public.admin_meetings FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete meetings"
  ON public.admin_meetings FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_admin_meetings_updated_at
  BEFORE UPDATE ON public.admin_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_meetings_org ON public.admin_meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_meetings_date ON public.admin_meetings(start_date);
CREATE INDEX IF NOT EXISTS idx_admin_meetings_organizer ON public.admin_meetings(organizer_user_id);

-- Create admin_meeting_attendees table
CREATE TABLE IF NOT EXISTS public.admin_meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.admin_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rsvp_status public.rsvp_status NOT NULL DEFAULT 'pending',
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

-- Enable RLS
ALTER TABLE public.admin_meeting_attendees ENABLE ROW LEVEL SECURITY;

-- RLS Policies (scoped via meeting join)
CREATE POLICY "Org members can view attendees"
  ON public.admin_meeting_attendees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.admin_meetings m
    WHERE m.id = meeting_id
    AND public.is_org_member(auth.uid(), m.organization_id)
  ));

CREATE POLICY "Org members can create attendees"
  ON public.admin_meeting_attendees FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_meetings m
    WHERE m.id = meeting_id
    AND public.is_org_member(auth.uid(), m.organization_id)
  ));

CREATE POLICY "Attendees can update own rsvp"
  ON public.admin_meeting_attendees FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.admin_meetings m
      WHERE m.id = meeting_id
      AND m.organizer_user_id = auth.uid()
    )
  );

CREATE POLICY "Organizer can delete attendees"
  ON public.admin_meeting_attendees FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.admin_meetings m
    WHERE m.id = meeting_id
    AND (m.organizer_user_id = auth.uid() OR public.is_org_admin(auth.uid(), m.organization_id))
  ));

-- Index
CREATE INDEX IF NOT EXISTS idx_admin_meeting_attendees_meeting ON public.admin_meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_admin_meeting_attendees_user ON public.admin_meeting_attendees(user_id);
