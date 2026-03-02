
-- Create salon_chair_assignments table for weekly chair-to-stylist mapping
CREATE TABLE IF NOT EXISTS public.salon_chair_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  chair_id UUID NOT NULL REFERENCES public.rental_stations(id) ON DELETE CASCADE,
  stylist_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chair_id, week_start_date)
);

-- Validation trigger for status (instead of CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_chair_assignment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'pending') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be active or pending.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_chair_assignment_status_trigger
  BEFORE INSERT OR UPDATE ON public.salon_chair_assignments
  FOR EACH ROW EXECUTE FUNCTION public.validate_chair_assignment_status();

-- Updated_at trigger
CREATE TRIGGER update_salon_chair_assignments_updated_at
  BEFORE UPDATE ON public.salon_chair_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.salon_chair_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view chair assignments"
  ON public.salon_chair_assignments FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create chair assignments"
  ON public.salon_chair_assignments FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update chair assignments"
  ON public.salon_chair_assignments FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete chair assignments"
  ON public.salon_chair_assignments FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_salon_chair_assignments_org_week
  ON public.salon_chair_assignments(organization_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_salon_chair_assignments_location
  ON public.salon_chair_assignments(location_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_salon_chair_assignments_stylist
  ON public.salon_chair_assignments(stylist_user_id, week_start_date);
