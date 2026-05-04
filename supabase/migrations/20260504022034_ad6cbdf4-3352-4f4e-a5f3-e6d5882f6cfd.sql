UPDATE public.location_review_settings
SET default_platform_priority = array_remove(default_platform_priority, 'yelp')
WHERE 'yelp' = ANY(default_platform_priority);

ALTER TABLE public.location_review_settings
  ALTER COLUMN default_platform_priority
  SET DEFAULT ARRAY['google','apple','facebook']::TEXT[];

ALTER TABLE public.location_review_settings
  DROP COLUMN IF EXISTS yelp_review_url;