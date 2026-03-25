
ALTER TABLE public.mix_sessions
  ADD COLUMN IF NOT EXISTS container_type public.container_type NOT NULL DEFAULT 'bowl';
