
-- Command audit log for all backroom command executions
CREATE TABLE public.command_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  command_name TEXT NOT NULL,
  command_payload JSONB NOT NULL DEFAULT '{}',
  idempotency_key TEXT,
  initiated_by UUID,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  outcome TEXT NOT NULL DEFAULT 'executed',
  validation_errors JSONB,
  result_entity_type TEXT,
  result_entity_id TEXT,
  source TEXT NOT NULL DEFAULT 'ui'
);

-- Index for querying by org + command
CREATE INDEX idx_command_audit_org_command ON public.command_audit_log (organization_id, command_name);
-- Index for idempotency lookups
CREATE INDEX idx_command_audit_idempotency ON public.command_audit_log (idempotency_key) WHERE idempotency_key IS NOT NULL;
-- Index for time-based queries
CREATE INDEX idx_command_audit_initiated ON public.command_audit_log (initiated_at DESC);

-- RLS
ALTER TABLE public.command_audit_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can INSERT for their own org
CREATE POLICY "Users can insert audit logs for own org"
ON public.command_audit_log FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_member(auth.uid(), organization_id)
);

-- Only admins/managers can read audit logs
CREATE POLICY "Admins can read audit logs"
ON public.command_audit_log FOR SELECT TO authenticated
USING (
  public.is_org_admin(auth.uid(), organization_id)
);
