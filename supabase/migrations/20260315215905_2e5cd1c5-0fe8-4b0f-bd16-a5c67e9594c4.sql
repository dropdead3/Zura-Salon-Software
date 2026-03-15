
-- Create backroom_coach_assignments table
CREATE TABLE IF NOT EXISTS public.backroom_coach_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (coach_user_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.backroom_coach_assignments ENABLE ROW LEVEL SECURITY;

-- Platform users can view all assignments
CREATE POLICY "Platform users can view assignments"
  ON public.backroom_coach_assignments FOR SELECT
  TO authenticated
  USING (public.is_platform_user(auth.uid()));

-- Platform admin/owner can manage assignments
CREATE POLICY "Platform admins can insert assignments"
  ON public.backroom_coach_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_platform_role(auth.uid(), 'platform_admin')
    OR public.has_platform_role(auth.uid(), 'platform_owner')
  );

CREATE POLICY "Platform admins can update assignments"
  ON public.backroom_coach_assignments FOR UPDATE
  TO authenticated
  USING (
    public.has_platform_role(auth.uid(), 'platform_admin')
    OR public.has_platform_role(auth.uid(), 'platform_owner')
  )
  WITH CHECK (
    public.has_platform_role(auth.uid(), 'platform_admin')
    OR public.has_platform_role(auth.uid(), 'platform_owner')
  );

CREATE POLICY "Platform admins can delete assignments"
  ON public.backroom_coach_assignments FOR DELETE
  TO authenticated
  USING (
    public.has_platform_role(auth.uid(), 'platform_admin')
    OR public.has_platform_role(auth.uid(), 'platform_owner')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coach_assignments_org ON public.backroom_coach_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_coach_assignments_coach ON public.backroom_coach_assignments(coach_user_id);
