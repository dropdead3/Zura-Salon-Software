
-- Create organization_apps table for managing app subscriptions per org
CREATE TABLE IF NOT EXISTS public.organization_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  app_key TEXT NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, app_key)
);

-- Enable RLS
ALTER TABLE public.organization_apps ENABLE ROW LEVEL SECURITY;

-- RLS: org members can read their org's apps
CREATE POLICY "Org members can view their org apps"
  ON public.organization_apps FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
  );

-- RLS: org admins can manage apps
CREATE POLICY "Org admins can manage apps"
  ON public.organization_apps FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Seed Drop-Dead-Salons (founder org) with all current apps
INSERT INTO public.organization_apps (organization_id, app_key)
SELECT id, app_key
FROM public.organizations
CROSS JOIN (VALUES ('backroom')) AS apps(app_key)
WHERE slug = 'drop-dead-salons'
ON CONFLICT DO NOTHING;
