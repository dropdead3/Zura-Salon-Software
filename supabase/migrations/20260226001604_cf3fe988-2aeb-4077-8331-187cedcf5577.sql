
-- ============================================================
-- THEME INFRASTRUCTURE SYSTEM - Production Schema
-- ============================================================

-- 1a. Evolve website_themes into full Theme entity
ALTER TABLE public.website_themes
  ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS supported_features JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS compatibility_rules JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS blueprint JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Updated_at trigger for website_themes
CREATE TRIGGER update_website_themes_updated_at
  BEFORE UPDATE ON public.website_themes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: builtin themes (org_id IS NULL) readable by all authenticated, org themes scoped
DROP POLICY IF EXISTS "Anyone can view available themes" ON public.website_themes;
CREATE POLICY "Authenticated users can view builtin themes"
  ON public.website_themes FOR SELECT
  USING (
    organization_id IS NULL
    OR public.is_org_member(auth.uid(), organization_id)
  );

-- 1b. theme_section_types - semantic section type registry
CREATE TABLE IF NOT EXISTS public.theme_section_types (
  id TEXT PRIMARY KEY,
  semantic_category TEXT NOT NULL,
  canonical_fields_schema JSONB NOT NULL DEFAULT '{}',
  allowed_field_types TEXT[] DEFAULT '{}',
  max_instances_per_page INTEGER DEFAULT NULL,
  is_portable BOOLEAN DEFAULT true,
  transformation_rules JSONB DEFAULT '{}',
  performance_weight INTEGER DEFAULT 1,
  is_builtin BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.theme_section_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read section types"
  ON public.theme_section_types FOR SELECT
  USING (true);

-- Seed built-in section types
INSERT INTO public.theme_section_types (id, semantic_category, canonical_fields_schema, max_instances_per_page, performance_weight) VALUES
  ('hero', 'hero', '{"headline":"text","subheadline":"text","cta_label":"text","cta_url":"url","background_image":"image"}', 1, 3),
  ('brand_statement', 'content', '{"statement":"rich_text","animation":"text"}', 1, 2),
  ('testimonials', 'proof', '{"source":"table:testimonials","max_items":"number"}', 1, 2),
  ('services_preview', 'services', '{"source":"table:services","layout":"text"}', 1, 3),
  ('popular_services', 'services', '{"source":"table:services","filter":"popular","max_items":"number"}', 1, 2),
  ('gallery', 'media', '{"source":"table:gallery_images","layout":"text"}', 1, 4),
  ('new_client', 'cta', '{"headline":"text","body":"rich_text","cta_label":"text","cta_url":"url"}', 1, 1),
  ('stylists', 'team', '{"source":"table:employee_profiles","max_items":"number"}', 1, 3),
  ('locations', 'contact', '{"source":"table:locations"}', 1, 2),
  ('faq', 'content', '{"source":"table:faqs"}', 1, 1),
  ('extensions', 'services', '{"headline":"text","body":"rich_text","images":"image_list"}', 1, 3),
  ('brands', 'proof', '{"source":"table:brands","layout":"text"}', 1, 1),
  ('drink_menu', 'content', '{"source":"table:drinks"}', 1, 1),
  ('rich_text', 'content', '{"heading":"text","body":"rich_text","alignment":"text"}', NULL, 1),
  ('image_text', 'content', '{"image":"image","heading":"text","body":"rich_text","cta_label":"text","cta_url":"url","image_position":"text"}', NULL, 2),
  ('video', 'media', '{"video_url":"url","provider":"text","autoplay":"boolean"}', NULL, 5),
  ('custom_cta', 'cta', '{"headline":"text","body":"text","cta_label":"text","cta_url":"url","background":"image"}', 4, 1),
  ('spacer', 'spacing', '{"height":"number","show_divider":"boolean"}', NULL, 0)
ON CONFLICT (id) DO NOTHING;

-- 1c. canonical_content - theme-agnostic content store
CREATE TABLE IF NOT EXISTS public.canonical_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  value JSONB NOT NULL DEFAULT '{}',
  source TEXT DEFAULT 'manual',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, content_key)
);

ALTER TABLE public.canonical_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view canonical content"
  ON public.canonical_content FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert canonical content"
  ON public.canonical_content FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update canonical content"
  ON public.canonical_content FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete canonical content"
  ON public.canonical_content FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_canonical_content_updated_at
  BEFORE UPDATE ON public.canonical_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_canonical_content_org
  ON public.canonical_content(organization_id);

-- 1d. theme_slot_mappings - per-theme slot definitions
CREATE TABLE IF NOT EXISTS public.theme_slot_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id TEXT NOT NULL REFERENCES public.website_themes(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL,
  semantic_type TEXT NOT NULL,
  expected_field_type TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  primary_source TEXT NOT NULL,
  fallback_source TEXT,
  transformation_rules JSONB DEFAULT '{}',
  performance_priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(theme_id, slot_id)
);

ALTER TABLE public.theme_slot_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read slot mappings"
  ON public.theme_slot_mappings FOR SELECT
  USING (true);

CREATE POLICY "Platform users can manage slot mappings"
  ON public.theme_slot_mappings FOR ALL
  USING (public.is_platform_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_theme_slot_mappings_theme
  ON public.theme_slot_mappings(theme_id);

-- 1e. theme_activations - versioned activation log
CREATE TABLE IF NOT EXISTS public.theme_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  theme_id TEXT NOT NULL REFERENCES public.website_themes(id),
  theme_version TEXT NOT NULL,
  pre_switch_snapshot JSONB,
  migration_report JSONB,
  activated_at TIMESTAMPTZ DEFAULT now(),
  activated_by UUID REFERENCES auth.users(id),
  is_current BOOLEAN DEFAULT true
);

ALTER TABLE public.theme_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view activations"
  ON public.theme_activations FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert activations"
  ON public.theme_activations FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update activations"
  ON public.theme_activations FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_theme_activations_org
  ON public.theme_activations(organization_id);

CREATE INDEX IF NOT EXISTS idx_theme_activations_current
  ON public.theme_activations(organization_id, is_current) WHERE is_current = true;

-- Seed blueprints for existing themes
UPDATE public.website_themes SET blueprint = '{
  "required_pages": ["home"],
  "default_page_templates": {
    "home": {"nav_order": 0}
  },
  "default_navigation": {
    "max_top_level_items": 7,
    "max_depth": 2,
    "max_cta_items": 2,
    "required_cta": true,
    "sticky_mobile_cta": true
  },
  "url_structure": {
    "pattern": "/{page-slug}",
    "location_pattern": "/locations/{location-slug}"
  },
  "allowed_section_types": ["hero","brand_statement","testimonials","services_preview","popular_services","gallery","new_client","stylists","locations","faq","extensions","brands","drink_menu","rich_text","image_text","video","custom_cta","spacer"],
  "section_limits": {"hero": {"max": 1}, "custom_cta": {"max": 4}},
  "header_layout": "standard",
  "footer_layout": "standard",
  "token_overrides": {"lockable": ["primary","background","card-radius"], "defaults": {}},
  "locking": {"header_locked": true, "footer_locked": true, "nav_structure_locked": false, "token_layer_locked": false},
  "max_page_weight": 50,
  "location_support": {"auto_generate_pages": true, "nav_insertion": "under_locations", "page_template": "location_detail"}
}'::jsonb
WHERE blueprint = '{}'::jsonb;

-- Set categories for existing themes
UPDATE public.website_themes SET category = 'salon' WHERE category = 'general';
