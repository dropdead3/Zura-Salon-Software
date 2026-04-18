ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS animation_intensity TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS user_preferences_animation_intensity_check;

ALTER TABLE public.user_preferences
ADD CONSTRAINT user_preferences_animation_intensity_check
CHECK (animation_intensity IN ('calm', 'standard', 'off'));

COMMENT ON COLUMN public.user_preferences.animation_intensity IS 'Per-user animation preference: calm (slower), standard (default), off (instant, accessibility)';