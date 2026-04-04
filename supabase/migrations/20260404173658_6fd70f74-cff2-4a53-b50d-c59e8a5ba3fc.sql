ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS dual_role_destination TEXT DEFAULT NULL;