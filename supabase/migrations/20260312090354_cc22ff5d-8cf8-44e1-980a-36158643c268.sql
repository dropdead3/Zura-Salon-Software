
-- Staff Pinned Products
CREATE TABLE IF NOT EXISTS public.staff_pinned_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.staff_pinned_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pinned products"
  ON public.staff_pinned_products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pinned products"
  ON public.staff_pinned_products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pinned products"
  ON public.staff_pinned_products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pinned products"
  ON public.staff_pinned_products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_staff_pinned_products_user ON public.staff_pinned_products(user_id);

-- Product Substitutions
CREATE TABLE IF NOT EXISTS public.product_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  substitute_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  priority INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, product_id, substitute_product_id)
);

ALTER TABLE public.product_substitutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view substitutions"
  ON public.product_substitutions FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert substitutions"
  ON public.product_substitutions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update substitutions"
  ON public.product_substitutions FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete substitutions"
  ON public.product_substitutions FOR DELETE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_product_substitutions_product ON public.product_substitutions(product_id);
CREATE INDEX IF NOT EXISTS idx_product_substitutions_org ON public.product_substitutions(organization_id);

-- Add prep mode and confidence score to mix_sessions
ALTER TABLE public.mix_sessions
  ADD COLUMN IF NOT EXISTS is_prep_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS prep_approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS prep_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 0;
