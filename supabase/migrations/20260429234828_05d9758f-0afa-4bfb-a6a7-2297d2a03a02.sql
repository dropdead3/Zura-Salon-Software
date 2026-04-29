-- 1. Add restore lineage to existing page versions
ALTER TABLE public.website_page_versions
  ADD COLUMN IF NOT EXISTS restored_from_version_id uuid NULL
    REFERENCES public.website_page_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_website_page_versions_restored_from
  ON public.website_page_versions(restored_from_version_id);

-- 2. New table for site-wide (theme/footer/announcement) version snapshots
CREATE TABLE IF NOT EXISTS public.website_site_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  surface text NOT NULL CHECK (surface IN ('theme','footer','announcement_bar','navigation')),
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'published',
  saved_by uuid NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  change_summary text NULL,
  restored_from_version_id uuid NULL REFERENCES public.website_site_versions(id) ON DELETE SET NULL,
  UNIQUE (organization_id, surface, version_number)
);

CREATE INDEX IF NOT EXISTS idx_website_site_versions_org_surface
  ON public.website_site_versions(organization_id, surface, version_number DESC);

ALTER TABLE public.website_site_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view site versions"
  ON public.website_site_versions
  FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert site versions"
  ON public.website_site_versions
  FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update site versions"
  ON public.website_site_versions
  FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete site versions"
  ON public.website_site_versions
  FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));