-- Wave 13D — idempotency for commit-org-setup + dwell_ms convenience index.
-- Allows the orchestrator to dedupe double-clicks within a 5-minute window
-- by client-supplied idempotency key.
ALTER TABLE public.org_setup_commit_log
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_org_setup_commit_log_idempotency
  ON public.org_setup_commit_log (organization_id, idempotency_key, system)
  WHERE idempotency_key IS NOT NULL;