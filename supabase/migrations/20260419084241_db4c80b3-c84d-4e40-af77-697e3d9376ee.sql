-- ============================================
-- Wave 27.1 — Role-First Handbook OS Foundation
-- ============================================

-- 1. Extend org_handbooks with role scoping + legacy ack link
ALTER TABLE public.org_handbooks
  ADD COLUMN IF NOT EXISTS primary_role TEXT NULL,
  ADD COLUMN IF NOT EXISTS legacy_handbook_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_org_handbooks_primary_role
  ON public.org_handbooks(organization_id, primary_role)
  WHERE primary_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_handbooks_legacy_link
  ON public.org_handbooks(legacy_handbook_id)
  WHERE legacy_handbook_id IS NOT NULL;

-- 2. Shared policy blocks (canonical, reusable)
CREATE TABLE IF NOT EXISTS public.org_policy_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  summary TEXT,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (organization_id, slug)
);

ALTER TABLE public.org_policy_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view policy blocks"
  ON public.org_policy_blocks FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create policy blocks"
  ON public.org_policy_blocks FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update policy blocks"
  ON public.org_policy_blocks FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete policy blocks"
  ON public.org_policy_blocks FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_org_policy_blocks_updated_at
  BEFORE UPDATE ON public.org_policy_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_org_policy_blocks_org
  ON public.org_policy_blocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_policy_blocks_category
  ON public.org_policy_blocks(organization_id, category);

-- 3. Handbook ↔ policy block references (M:N with overlay)
CREATE TABLE IF NOT EXISTS public.org_handbook_block_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  handbook_id UUID NOT NULL REFERENCES public.org_handbooks(id) ON DELETE CASCADE,
  policy_block_id UUID NOT NULL REFERENCES public.org_policy_blocks(id) ON DELETE CASCADE,
  overlay_body TEXT,
  is_forked BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (handbook_id, policy_block_id)
);

ALTER TABLE public.org_handbook_block_refs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view handbook block refs"
  ON public.org_handbook_block_refs FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create handbook block refs"
  ON public.org_handbook_block_refs FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update handbook block refs"
  ON public.org_handbook_block_refs FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete handbook block refs"
  ON public.org_handbook_block_refs FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_org_handbook_block_refs_updated_at
  BEFORE UPDATE ON public.org_handbook_block_refs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_handbook_block_refs_handbook
  ON public.org_handbook_block_refs(handbook_id);
CREATE INDEX IF NOT EXISTS idx_handbook_block_refs_block
  ON public.org_handbook_block_refs(policy_block_id);

-- 4. Handbook changelog (version diffs for targeted re-ack)
CREATE TABLE IF NOT EXISTS public.org_handbook_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  handbook_id UUID NOT NULL REFERENCES public.org_handbooks(id) ON DELETE CASCADE,
  version_id UUID NULL,
  change_type TEXT NOT NULL,
  section_key TEXT,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.org_handbook_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view handbook changelog"
  ON public.org_handbook_changelog FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create handbook changelog"
  ON public.org_handbook_changelog FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete handbook changelog"
  ON public.org_handbook_changelog FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_handbook_changelog_handbook
  ON public.org_handbook_changelog(handbook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handbook_changelog_org
  ON public.org_handbook_changelog(organization_id, created_at DESC);