
CREATE TABLE IF NOT EXISTS public.level_progress_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  stylist_level_id UUID REFERENCES public.stylist_levels(id) ON DELETE SET NULL,
  composite_score NUMERIC NOT NULL DEFAULT 0,
  criteria_snapshot JSONB,
  snapshot_month DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.level_progress_snapshots ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_level_progress_snapshots_unique
  ON public.level_progress_snapshots(organization_id, user_id, snapshot_month);

CREATE INDEX IF NOT EXISTS idx_level_progress_snapshots_user
  ON public.level_progress_snapshots(organization_id, user_id);

CREATE POLICY "Org members can view snapshots"
  ON public.level_progress_snapshots FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert snapshots"
  ON public.level_progress_snapshots FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update snapshots"
  ON public.level_progress_snapshots FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
