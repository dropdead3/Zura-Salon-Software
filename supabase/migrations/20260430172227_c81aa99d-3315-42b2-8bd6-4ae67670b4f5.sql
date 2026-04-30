ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS draft_value jsonb,
  ADD COLUMN IF NOT EXISTS draft_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS draft_updated_by uuid REFERENCES auth.users(id);

UPDATE public.site_settings
   SET draft_value = value
 WHERE draft_value IS NULL;