
-- Create staff_schedule_blocks table
CREATE TABLE IF NOT EXISTS public.staff_schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phorest_staff_id TEXT,
  location_id TEXT,
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'break',
  label TEXT,
  source TEXT NOT NULL DEFAULT 'zura',
  phorest_id TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint for Phorest dedup
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_schedule_blocks_phorest_id
  ON public.staff_schedule_blocks(phorest_id) WHERE phorest_id IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_staff_schedule_blocks_org
  ON public.staff_schedule_blocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedule_blocks_date
  ON public.staff_schedule_blocks(organization_id, block_date);
CREATE INDEX IF NOT EXISTS idx_staff_schedule_blocks_user
  ON public.staff_schedule_blocks(user_id, block_date);

-- Enable RLS
ALTER TABLE public.staff_schedule_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view schedule blocks"
  ON public.staff_schedule_blocks FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create schedule blocks"
  ON public.staff_schedule_blocks FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update schedule blocks"
  ON public.staff_schedule_blocks FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete schedule blocks"
  ON public.staff_schedule_blocks FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_staff_schedule_blocks_updated_at
  BEFORE UPDATE ON public.staff_schedule_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
