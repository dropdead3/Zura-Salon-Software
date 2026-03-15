ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS last_backroom_coached_at TIMESTAMPTZ;