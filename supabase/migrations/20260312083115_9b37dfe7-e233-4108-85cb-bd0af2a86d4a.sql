
-- 1e. Extend stock_movements with location_id, reference_type, reference_id
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS location_id TEXT,
  ADD COLUMN IF NOT EXISTS reference_type TEXT,
  ADD COLUMN IF NOT EXISTS reference_id UUID;

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
  ON public.stock_movements(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_location
  ON public.stock_movements(location_id);

-- 1a. service_recipe_baselines
CREATE TABLE IF NOT EXISTS public.service_recipe_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  expected_quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'g',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, service_id, product_id)
);

ALTER TABLE public.service_recipe_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view baselines"
  ON public.service_recipe_baselines FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage baselines"
  ON public.service_recipe_baselines FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_service_recipe_baselines_updated_at
  BEFORE UPDATE ON public.service_recipe_baselines
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE INDEX IF NOT EXISTS idx_recipe_baselines_service
  ON public.service_recipe_baselines(service_id);

CREATE INDEX IF NOT EXISTS idx_recipe_baselines_org
  ON public.service_recipe_baselines(organization_id);

-- 1b. count_sessions
CREATE TABLE IF NOT EXISTS public.count_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  total_products_counted INTEGER DEFAULT 0,
  total_variance_units NUMERIC DEFAULT 0,
  total_variance_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.count_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view count sessions"
  ON public.count_sessions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage count sessions"
  ON public.count_sessions FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE TRIGGER update_count_sessions_updated_at
  BEFORE UPDATE ON public.count_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE INDEX IF NOT EXISTS idx_count_sessions_org
  ON public.count_sessions(organization_id);

-- 1c. Add count_session_id to stock_counts
ALTER TABLE public.stock_counts
  ADD COLUMN IF NOT EXISTS count_session_id UUID REFERENCES public.count_sessions(id) ON DELETE SET NULL;

-- 1d. stock_transfer_lines
CREATE TABLE IF NOT EXISTS public.stock_transfer_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'units',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_transfer_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transfer line access via parent"
  ON public.stock_transfer_lines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stock_transfers t
    WHERE t.id = transfer_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Transfer line write via parent"
  ON public.stock_transfer_lines FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.stock_transfers t
    WHERE t.id = transfer_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stock_transfers t
    WHERE t.id = transfer_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE INDEX IF NOT EXISTS idx_transfer_lines_transfer
  ON public.stock_transfer_lines(transfer_id);
