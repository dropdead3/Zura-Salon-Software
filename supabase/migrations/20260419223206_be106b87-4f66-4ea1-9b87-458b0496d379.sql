-- ============================================================
-- Wave 28.10.1 — Policy Acknowledgment Hardening
-- ============================================================

-- 1. De-duplication: one ack per (policy_version, lower(email))
--    NOT a partial index because every ack should always carry email.
CREATE UNIQUE INDEX IF NOT EXISTS uq_policy_ack_version_email
  ON public.policy_acknowledgments (policy_version_id, lower(client_email))
  WHERE client_email IS NOT NULL;

-- 2. Conflict-resolution audit log
CREATE TABLE IF NOT EXISTS public.policy_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_id UUID,
  version_id UUID,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.policy_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view change log"
  ON public.policy_change_log FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can insert change log"
  ON public.policy_change_log FOR INSERT
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND auth.uid() = actor_user_id
  );

CREATE INDEX IF NOT EXISTS idx_policy_change_log_org
  ON public.policy_change_log (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_change_log_policy
  ON public.policy_change_log (policy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_change_log_version
  ON public.policy_change_log (version_id);