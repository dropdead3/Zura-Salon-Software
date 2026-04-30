-- FAQ items
CREATE TABLE public.website_faq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_website_faq_items_org ON public.website_faq_items(organization_id, sort_order);
ALTER TABLE public.website_faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view enabled FAQ items"
  ON public.website_faq_items FOR SELECT
  USING (enabled = true);

CREATE POLICY "Org admins can view all FAQ items"
  ON public.website_faq_items FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert FAQ items"
  ON public.website_faq_items FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update FAQ items"
  ON public.website_faq_items FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete FAQ items"
  ON public.website_faq_items FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER trg_website_faq_items_updated_at
  BEFORE UPDATE ON public.website_faq_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Testimonials (general + extensions via surface discriminator)
CREATE TABLE public.website_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  surface TEXT NOT NULL DEFAULT 'general' CHECK (surface IN ('general', 'extensions')),
  title TEXT,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  source_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_website_testimonials_org_surface ON public.website_testimonials(organization_id, surface, sort_order);
ALTER TABLE public.website_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view enabled testimonials"
  ON public.website_testimonials FOR SELECT
  USING (enabled = true);

CREATE POLICY "Org members can view all testimonials"
  ON public.website_testimonials FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert testimonials"
  ON public.website_testimonials FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update testimonials"
  ON public.website_testimonials FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete testimonials"
  ON public.website_testimonials FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER trg_website_testimonials_updated_at
  BEFORE UPDATE ON public.website_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extension categories
CREATE TABLE public.website_extension_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_website_extension_categories_org ON public.website_extension_categories(organization_id, sort_order);
ALTER TABLE public.website_extension_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view enabled extension categories"
  ON public.website_extension_categories FOR SELECT
  USING (enabled = true);

CREATE POLICY "Org members can view all extension categories"
  ON public.website_extension_categories FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert extension categories"
  ON public.website_extension_categories FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update extension categories"
  ON public.website_extension_categories FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete extension categories"
  ON public.website_extension_categories FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER trg_website_extension_categories_updated_at
  BEFORE UPDATE ON public.website_extension_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generic section content (brand_statement, new_client, extensions, footer_cta)
CREATE TABLE public.website_section_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  eyebrow TEXT,
  headline TEXT,
  paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_cta_label TEXT,
  primary_cta_url TEXT,
  secondary_cta_label TEXT,
  secondary_cta_url TEXT,
  image_url TEXT,
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, section_key)
);
ALTER TABLE public.website_section_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view section content"
  ON public.website_section_content FOR SELECT
  USING (true);

CREATE POLICY "Org admins can insert section content"
  ON public.website_section_content FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update section content"
  ON public.website_section_content FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete section content"
  ON public.website_section_content FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER trg_website_section_content_updated_at
  BEFORE UPDATE ON public.website_section_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();