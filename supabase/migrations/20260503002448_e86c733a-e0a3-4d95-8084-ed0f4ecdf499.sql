
CREATE TABLE IF NOT EXISTS public.feedback_theme_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES auth.users(id),
  window_days INTEGER NOT NULL DEFAULT 90,
  response_count INTEGER NOT NULL DEFAULT 0,
  negative_count INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'complete',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_theme_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view theme snapshots"
  ON public.feedback_theme_snapshots FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create theme snapshots"
  ON public.feedback_theme_snapshots FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete theme snapshots"
  ON public.feedback_theme_snapshots FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_feedback_theme_snapshots_org_created
  ON public.feedback_theme_snapshots(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.feedback_theme_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES public.feedback_theme_snapshots(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  theme_label TEXT NOT NULL,
  category TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  response_count INTEGER NOT NULL DEFAULT 0,
  share_of_negative NUMERIC(5,4),
  suggested_action TEXT,
  evidence_quote TEXT,
  sample_response_ids UUID[] NOT NULL DEFAULT '{}',
  rank INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_theme_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view theme clusters"
  ON public.feedback_theme_clusters FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create theme clusters"
  ON public.feedback_theme_clusters FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update theme clusters"
  ON public.feedback_theme_clusters FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete theme clusters"
  ON public.feedback_theme_clusters FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_feedback_theme_clusters_snapshot
  ON public.feedback_theme_clusters(snapshot_id, rank);

CREATE INDEX IF NOT EXISTS idx_feedback_theme_clusters_org
  ON public.feedback_theme_clusters(organization_id, created_at DESC);
