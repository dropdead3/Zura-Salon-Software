
-- Add social URL columns to business_settings
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url text,
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text;

-- Add social_links JSONB column to locations for per-location overrides
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT null;
