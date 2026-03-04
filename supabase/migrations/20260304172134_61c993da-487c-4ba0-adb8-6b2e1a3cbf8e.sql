
-- Create meeting_templates table
CREATE TABLE IF NOT EXISTS public.meeting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  meeting_type public.meeting_type NOT NULL DEFAULT 'other',
  title_template TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  meeting_mode public.meeting_mode NOT NULL DEFAULT 'in_person',
  location_id TEXT,
  video_link TEXT,
  attendee_user_ids TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view templates"
  ON public.meeting_templates FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create templates"
  ON public.meeting_templates FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update templates"
  ON public.meeting_templates FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete templates"
  ON public.meeting_templates FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_meeting_templates_updated_at
  BEFORE UPDATE ON public.meeting_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_meeting_templates_org
  ON public.meeting_templates(organization_id);

-- Create shift role context enum
CREATE TYPE public.shift_role_context AS ENUM ('front_desk', 'receptionist', 'coordinator', 'other');

-- Create shift status enum
CREATE TYPE public.shift_status AS ENUM ('scheduled', 'swapped', 'cancelled');

-- Create staff_shifts table
CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  role_context public.shift_role_context NOT NULL DEFAULT 'other',
  status public.shift_status NOT NULL DEFAULT 'scheduled',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view shifts"
  ON public.staff_shifts FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create shifts"
  ON public.staff_shifts FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update shifts"
  ON public.staff_shifts FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete shifts"
  ON public.staff_shifts FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_staff_shifts_updated_at
  BEFORE UPDATE ON public.staff_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_staff_shifts_org ON public.staff_shifts(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON public.staff_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_user ON public.staff_shifts(user_id);
