
-- Smart Mix Assist settings table
CREATE TABLE IF NOT EXISTS public.smart_mix_assist_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  ratio_lock_enabled BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);

ALTER TABLE public.smart_mix_assist_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view smart mix assist settings"
  ON public.smart_mix_assist_settings FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert smart mix assist settings"
  ON public.smart_mix_assist_settings FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update smart mix assist settings"
  ON public.smart_mix_assist_settings FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_smart_mix_assist_settings_updated_at
  BEFORE UPDATE ON public.smart_mix_assist_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE INDEX IF NOT EXISTS idx_smart_mix_assist_settings_org
  ON public.smart_mix_assist_settings(organization_id);
