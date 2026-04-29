-- Wave 1: AI Capability Safety Hardening (P0s)

-- 1. Persist hashed confirmation token at proposal time so executor can verify it.
ALTER TABLE public.ai_action_audit
  ADD COLUMN IF NOT EXISTS expected_confirmation_token_hash text;

-- 2. Declare ownership scope on capabilities so handlers can enforce it uniformly.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ai_capabilities' AND column_name='ownership_scope'
  ) THEN
    ALTER TABLE public.ai_capabilities
      ADD COLUMN ownership_scope text NOT NULL DEFAULT 'org'
      CHECK (ownership_scope IN ('self','org','any'));
  END IF;
END $$;

-- Backfill: appointment mutations default to ownership-aware (handler decides).
UPDATE public.ai_capabilities SET ownership_scope = 'org'
  WHERE id IN ('appointments.cancel','appointments.reschedule')
    AND ownership_scope = 'org';

-- Tighten the deactivate scope to org-wide for managers.
UPDATE public.ai_capabilities SET ownership_scope = 'org'
  WHERE id IN ('team.deactivate_member','team.reactivate_member');

-- 3. Explicit deny-by-default INSERT policy on audit log — only service role writes.
DROP POLICY IF EXISTS "Deny client inserts on audit" ON public.ai_action_audit;
CREATE POLICY "Deny client inserts on audit"
  ON public.ai_action_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- 4. Index for throttle queries (Wave 2 prep but cheap to ship now).
CREATE INDEX IF NOT EXISTS idx_ai_action_audit_user_created
  ON public.ai_action_audit (user_id, created_at DESC);
