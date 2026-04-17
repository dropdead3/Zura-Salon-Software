-- Add suspension lifecycle and reconciliation tracking to backroom_location_entitlements
ALTER TABLE public.backroom_location_entitlements
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS requires_inventory_reconciliation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inventory_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inventory_verified_by UUID REFERENCES auth.users(id);

-- Index to make "needs reconciliation" lookups fast
CREATE INDEX IF NOT EXISTS idx_backroom_entitlements_reconciliation
  ON public.backroom_location_entitlements(organization_id, location_id)
  WHERE requires_inventory_reconciliation = true;

-- Index to make suspended-org lookups fast
CREATE INDEX IF NOT EXISTS idx_backroom_entitlements_suspended
  ON public.backroom_location_entitlements(organization_id)
  WHERE status = 'suspended';