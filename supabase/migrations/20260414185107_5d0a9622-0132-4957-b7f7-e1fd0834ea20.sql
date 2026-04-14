
CREATE TABLE IF NOT EXISTS public.terminal_splash_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  terminal_location_id TEXT NOT NULL,
  splash_origin TEXT NOT NULL DEFAULT 'custom',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id, terminal_location_id)
);

ALTER TABLE public.terminal_splash_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view splash metadata"
  ON public.terminal_splash_metadata FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert splash metadata"
  ON public.terminal_splash_metadata FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update splash metadata"
  ON public.terminal_splash_metadata FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete splash metadata"
  ON public.terminal_splash_metadata FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_terminal_splash_metadata_org
  ON public.terminal_splash_metadata(organization_id);

CREATE TRIGGER update_terminal_splash_metadata_updated_at
  BEFORE UPDATE ON public.terminal_splash_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
