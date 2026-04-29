-- ============================================================
-- AI Capability Registry
-- ============================================================
CREATE TABLE public.ai_capabilities (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  mutation BOOLEAN NOT NULL DEFAULT false,
  required_permission TEXT,
  required_role app_role[],
  param_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_template TEXT,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'med', 'high')),
  confirmation_token_field TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read enabled capabilities"
ON public.ai_capabilities
FOR SELECT
TO authenticated
USING (enabled = true);

CREATE POLICY "Platform staff can manage capabilities"
ON public.ai_capabilities
FOR ALL
TO authenticated
USING (public.is_platform_user(auth.uid()))
WITH CHECK (public.is_platform_user(auth.uid()));

CREATE TRIGGER trg_ai_capabilities_updated_at
BEFORE UPDATE ON public.ai_capabilities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- AI Action Audit Log
-- ============================================================
CREATE TABLE public.ai_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  capability_id TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('proposed','approved','denied','executed','failed')),
  reasoning TEXT,
  result JSONB,
  error TEXT,
  conversation_id UUID,
  message_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_action_audit_org ON public.ai_action_audit(organization_id, created_at DESC);
CREATE INDEX idx_ai_action_audit_user ON public.ai_action_audit(user_id, created_at DESC);
CREATE INDEX idx_ai_action_audit_capability ON public.ai_action_audit(capability_id);

ALTER TABLE public.ai_action_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view audit entries"
ON public.ai_action_audit
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));

-- Only service role can write (edge functions handle inserts/updates).
-- No INSERT/UPDATE/DELETE policies = denied for authenticated users.

-- ============================================================
-- Seed pilot capabilities
-- ============================================================
INSERT INTO public.ai_capabilities
  (id, category, display_name, description, mutation, required_permission, required_role, param_schema, preview_template, risk_level, confirmation_token_field)
VALUES
  (
    'team.find_member',
    'team',
    'Find team member',
    'Look up a team member by name, email, or role. Use this before any team mutation to resolve which person the user means.',
    false,
    NULL,
    NULL,
    '{"type":"object","required":["query"],"properties":{"query":{"type":"string","description":"Name, email, or partial match"}}}'::jsonb,
    NULL,
    'low',
    NULL
  ),
  (
    'team.deactivate_member',
    'team',
    'Deactivate team member',
    'Mark a team member inactive. They will no longer be bookable, lose dashboard access, and disappear from active rosters. Reversible via reactivate.',
    true,
    'manage_team',
    ARRAY['admin','super_admin']::app_role[],
    '{"type":"object","required":["member_id","member_name"],"properties":{"member_id":{"type":"string","format":"uuid"},"member_name":{"type":"string"},"reason":{"type":"string"}}}'::jsonb,
    'Deactivate {{member_name}}{{#reason}} — reason: {{reason}}{{/reason}}. They will lose access immediately and stop appearing in active rosters.',
    'high',
    'member_first_name'
  ),
  (
    'team.reactivate_member',
    'team',
    'Reactivate team member',
    'Restore a previously deactivated team member. Bookability and dashboard access are restored.',
    true,
    'manage_team',
    ARRAY['admin','super_admin']::app_role[],
    '{"type":"object","required":["member_id","member_name"],"properties":{"member_id":{"type":"string","format":"uuid"},"member_name":{"type":"string"}}}'::jsonb,
    'Reactivate {{member_name}}. They will regain access and appear in active rosters.',
    'med',
    NULL
  ),
  (
    'appointments.find_today',
    'appointments',
    'Find today''s appointments',
    'List today''s appointments, optionally filtered by stylist or location.',
    false,
    NULL,
    NULL,
    '{"type":"object","properties":{"staff_user_id":{"type":"string","format":"uuid"},"location_id":{"type":"string"}}}'::jsonb,
    NULL,
    'low',
    NULL
  ),
  (
    'appointments.reschedule',
    'appointments',
    'Reschedule appointment',
    'Move an appointment to a new date and time, optionally to a different stylist or location.',
    true,
    'manage_appointments',
    NULL,
    '{"type":"object","required":["appointment_id","client_name","new_date","new_time"],"properties":{"appointment_id":{"type":"string","format":"uuid"},"client_name":{"type":"string"},"new_date":{"type":"string","format":"date"},"new_time":{"type":"string"},"staff_user_id":{"type":"string","format":"uuid"},"location_id":{"type":"string"}}}'::jsonb,
    'Reschedule {{client_name}} to {{new_date}} at {{new_time}}.',
    'med',
    NULL
  ),
  (
    'appointments.cancel',
    'appointments',
    'Cancel appointment',
    'Cancel an appointment. Client will be notified per organization policy.',
    true,
    'manage_appointments',
    NULL,
    '{"type":"object","required":["appointment_id","client_name"],"properties":{"appointment_id":{"type":"string","format":"uuid"},"client_name":{"type":"string"},"reason":{"type":"string"}}}'::jsonb,
    'Cancel {{client_name}}''s appointment{{#reason}} — reason: {{reason}}{{/reason}}.',
    'med',
    NULL
  );