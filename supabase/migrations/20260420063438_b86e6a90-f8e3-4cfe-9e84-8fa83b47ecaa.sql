ALTER TABLE public.policy_org_profile
  ADD COLUMN IF NOT EXISTS operating_states text[] NOT NULL DEFAULT '{}';

UPDATE public.policy_org_profile
SET operating_states = ARRAY[primary_state]
WHERE primary_state IS NOT NULL
  AND primary_state <> ''
  AND (operating_states IS NULL OR array_length(operating_states, 1) IS NULL);
