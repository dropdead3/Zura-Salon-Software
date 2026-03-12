-- BUG-19 fix: Replace standard UNIQUE constraint on backroom_settings
-- with partial unique indexes to handle NULL location_id correctly.
-- In PostgreSQL NULL != NULL so UNIQUE(org, NULL, key) allows duplicates.

-- Drop the existing unique constraint if it exists
ALTER TABLE public.backroom_settings DROP CONSTRAINT IF EXISTS backroom_settings_organization_id_location_id_setting_ke_key;

-- Create partial unique index for org-level defaults (location_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_backroom_settings_org_key_null_loc
  ON public.backroom_settings (organization_id, setting_key)
  WHERE location_id IS NULL;

-- Create partial unique index for location-level overrides (location_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_backroom_settings_org_loc_key
  ON public.backroom_settings (organization_id, location_id, setting_key)
  WHERE location_id IS NOT NULL;