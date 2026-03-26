
-- The stock_transfer_lines columns were already added by the previous partial migration.
-- Create transfer_templates table (locations.id is TEXT)
CREATE TABLE IF NOT EXISTS public.transfer_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  from_location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  to_location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transfer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view templates"
  ON public.transfer_templates FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create templates"
  ON public.transfer_templates FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update templates"
  ON public.transfer_templates FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete templates"
  ON public.transfer_templates FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_transfer_templates_org
  ON public.transfer_templates(organization_id);

-- Create transfer_template_lines table
CREATE TABLE IF NOT EXISTS public.transfer_template_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.transfer_templates(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'units',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transfer_template_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Template lines viewable by org members"
  ON public.transfer_template_lines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.transfer_templates t
    WHERE t.id = template_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Template lines insertable by org admins"
  ON public.transfer_template_lines FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.transfer_templates t
    WHERE t.id = template_id
    AND public.is_org_admin(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Template lines deletable by org admins"
  ON public.transfer_template_lines FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.transfer_templates t
    WHERE t.id = template_id
    AND public.is_org_admin(auth.uid(), t.organization_id)
  ));

CREATE INDEX IF NOT EXISTS idx_transfer_template_lines_template
  ON public.transfer_template_lines(template_id);
