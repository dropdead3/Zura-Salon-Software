ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS dashboard_theme text NOT NULL DEFAULT 'system'
    CHECK (dashboard_theme IN ('light', 'dark', 'system'));