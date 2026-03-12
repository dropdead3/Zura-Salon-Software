
-- ============================================================
-- Inventory Ledger Architecture Migration
-- Extends stock_movements as immutable ledger (source of truth)
-- Creates inventory_projections (derived balance cache)
-- Adds trigger for automatic projection updates
-- ============================================================

-- 1. Extend stock_movements with event_type and unit columns
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'units';

-- 2. Backfill event_type from existing reason column
UPDATE public.stock_movements SET event_type = reason WHERE event_type IS NULL;

-- 3. Set NOT NULL after backfill
ALTER TABLE public.stock_movements ALTER COLUMN event_type SET NOT NULL;

-- 4. Create inventory_projections table
CREATE TABLE IF NOT EXISTS public.inventory_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id TEXT,
  on_hand NUMERIC NOT NULL DEFAULT 0,
  allocated NUMERIC NOT NULL DEFAULT 0,
  on_order NUMERIC NOT NULL DEFAULT 0,
  available NUMERIC GENERATED ALWAYS AS (on_hand - allocated) STORED,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, product_id, location_id)
);

-- 5. Enable RLS on inventory_projections
ALTER TABLE public.inventory_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view projections"
  ON public.inventory_projections FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage projections"
  ON public.inventory_projections FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- 6. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_inventory_projections_org_product
  ON public.inventory_projections(organization_id, product_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_event_type
  ON public.stock_movements(event_type);

-- 7. Rebuild function (full recalculation from ledger)
CREATE OR REPLACE FUNCTION public.rebuild_inventory_projection(
  p_org_id UUID, p_product_id UUID, p_location_id TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO inventory_projections (organization_id, product_id, location_id, on_hand, last_calculated_at)
  SELECT p_org_id, p_product_id, p_location_id,
    COALESCE(SUM(quantity_change), 0),
    now()
  FROM stock_movements
  WHERE organization_id = p_org_id
    AND product_id = p_product_id
    AND (p_location_id IS NULL AND location_id IS NULL
         OR location_id = p_location_id)
  ON CONFLICT (organization_id, product_id, location_id)
  DO UPDATE SET
    on_hand = EXCLUDED.on_hand,
    last_calculated_at = now();
END;
$$;

-- 8. Trigger function: incrementally update projection on ledger INSERT
CREATE OR REPLACE FUNCTION public.update_projection_on_ledger_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert projection row atomically
  INSERT INTO inventory_projections (organization_id, product_id, location_id, on_hand, last_calculated_at)
  VALUES (NEW.organization_id, NEW.product_id, NEW.location_id, NEW.quantity_change, now())
  ON CONFLICT (organization_id, product_id, location_id)
  DO UPDATE SET
    on_hand = inventory_projections.on_hand + NEW.quantity_change,
    last_calculated_at = now();

  -- Backward compatibility: sync aggregate to products.quantity_on_hand
  UPDATE products SET quantity_on_hand = (
    SELECT COALESCE(SUM(on_hand), 0) FROM inventory_projections
    WHERE product_id = NEW.product_id AND organization_id = NEW.organization_id
  ), updated_at = now()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

-- 9. Attach trigger
DROP TRIGGER IF EXISTS trg_projection_on_ledger_insert ON public.stock_movements;
CREATE TRIGGER trg_projection_on_ledger_insert
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION update_projection_on_ledger_insert();

-- 10. Immutability policies (block UPDATE and DELETE on ledger)
CREATE POLICY "Ledger entries are immutable"
  ON public.stock_movements FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "Ledger entries cannot be deleted"
  ON public.stock_movements FOR DELETE TO authenticated
  USING (false);

-- 11. Backfill inventory_projections from existing stock_movements data
INSERT INTO inventory_projections (organization_id, product_id, location_id, on_hand, last_calculated_at)
SELECT organization_id, product_id, location_id, SUM(quantity_change), now()
FROM stock_movements
GROUP BY organization_id, product_id, location_id
ON CONFLICT (organization_id, product_id, location_id)
DO UPDATE SET
  on_hand = EXCLUDED.on_hand,
  last_calculated_at = now();
