ALTER TABLE public.policy_library
  ADD COLUMN IF NOT EXISTS requires_minors BOOLEAN NOT NULL DEFAULT false;