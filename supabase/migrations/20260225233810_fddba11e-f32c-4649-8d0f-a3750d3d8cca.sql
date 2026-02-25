
-- Website page versions for audit + restore
CREATE TABLE public.website_page_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'published',
  saved_by UUID REFERENCES auth.users(id),
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary TEXT
);

-- Indexes
CREATE INDEX idx_page_versions_page_id ON public.website_page_versions(page_id);
CREATE INDEX idx_page_versions_org ON public.website_page_versions(organization_id);

-- RLS
ALTER TABLE public.website_page_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view page versions"
  ON public.website_page_versions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert page versions"
  ON public.website_page_versions FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete page versions"
  ON public.website_page_versions FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));
