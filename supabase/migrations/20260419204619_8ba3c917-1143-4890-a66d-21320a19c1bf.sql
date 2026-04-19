-- Wave 28.6: AI Drafter — policy_draft_jobs table for tracking AI variant generation

CREATE TABLE IF NOT EXISTS public.policy_draft_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.policy_versions(id) ON DELETE CASCADE,
  variant_type public.policy_variant_type NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-pro',
  prompt_hash TEXT,
  output_md TEXT,
  error TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.policy_draft_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view draft jobs"
  ON public.policy_draft_jobs FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create draft jobs"
  ON public.policy_draft_jobs FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update draft jobs"
  ON public.policy_draft_jobs FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_policy_draft_jobs_version
  ON public.policy_draft_jobs(organization_id, version_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_policy_draft_jobs_status
  ON public.policy_draft_jobs(status) WHERE status IN ('queued', 'running');