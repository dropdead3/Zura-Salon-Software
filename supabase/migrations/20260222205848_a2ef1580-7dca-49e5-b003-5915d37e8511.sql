
-- Create assistant_time_blocks table for time-based assistant scheduling
CREATE TABLE IF NOT EXISTS public.assistant_time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  requesting_user_id UUID NOT NULL,
  assistant_user_id UUID,
  status TEXT NOT NULL DEFAULT 'requested',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.assistant_time_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view time blocks"
  ON public.assistant_time_blocks FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create time blocks"
  ON public.assistant_time_blocks FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update time blocks"
  ON public.assistant_time_blocks FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can delete time blocks"
  ON public.assistant_time_blocks FOR DELETE
  USING (
    auth.uid() = requesting_user_id
    OR auth.uid() = created_by
    OR public.is_org_admin(auth.uid(), organization_id)
  );

-- Updated_at trigger
CREATE TRIGGER update_assistant_time_blocks_updated_at
  BEFORE UPDATE ON public.assistant_time_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assistant_time_blocks_org
  ON public.assistant_time_blocks(organization_id);

CREATE INDEX IF NOT EXISTS idx_assistant_time_blocks_date
  ON public.assistant_time_blocks(date, location_id);

CREATE INDEX IF NOT EXISTS idx_assistant_time_blocks_requesting_user
  ON public.assistant_time_blocks(requesting_user_id, date);

CREATE INDEX IF NOT EXISTS idx_assistant_time_blocks_assistant_user
  ON public.assistant_time_blocks(assistant_user_id, date);

-- Enable realtime for live calendar updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.assistant_time_blocks;
