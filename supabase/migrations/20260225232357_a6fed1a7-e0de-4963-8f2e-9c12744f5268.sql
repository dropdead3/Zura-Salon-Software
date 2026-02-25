
-- =============================================
-- Navigation Manager: website_menus, website_menu_items, website_menu_versions
-- =============================================

-- 1. website_menus
CREATE TABLE IF NOT EXISTS public.website_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

ALTER TABLE public.website_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view menus"
  ON public.website_menus FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create menus"
  ON public.website_menus FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update menus"
  ON public.website_menus FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete menus"
  ON public.website_menus FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_website_menus_updated_at
  BEFORE UPDATE ON public.website_menus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_website_menus_org ON public.website_menus(organization_id);

-- 2. website_menu_items
CREATE TABLE IF NOT EXISTS public.website_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.website_menus(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.website_menu_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'page_link',
  target_page_id TEXT,
  target_url TEXT,
  target_anchor TEXT,
  open_in_new_tab BOOLEAN NOT NULL DEFAULT false,
  cta_style TEXT,
  tracking_key TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'both',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.website_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view menu items"
  ON public.website_menu_items FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create menu items"
  ON public.website_menu_items FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update menu items"
  ON public.website_menu_items FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete menu items"
  ON public.website_menu_items FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_website_menu_items_updated_at
  BEFORE UPDATE ON public.website_menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_website_menu_items_menu ON public.website_menu_items(menu_id);
CREATE INDEX IF NOT EXISTS idx_website_menu_items_org ON public.website_menu_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_website_menu_items_parent ON public.website_menu_items(parent_id);

-- 3. website_menu_versions (audit + rollback)
CREATE TABLE IF NOT EXISTS public.website_menu_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.website_menus(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary TEXT
);

ALTER TABLE public.website_menu_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view menu versions"
  ON public.website_menu_versions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create menu versions"
  ON public.website_menu_versions FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_website_menu_versions_menu ON public.website_menu_versions(menu_id);
CREATE INDEX IF NOT EXISTS idx_website_menu_versions_org ON public.website_menu_versions(organization_id);
