
-- Singleton kill switches table
CREATE TABLE public.reputation_kill_switches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  dispatch_disabled BOOLEAN NOT NULL DEFAULT false,
  manual_send_disabled BOOLEAN NOT NULL DEFAULT false,
  webhook_processing_disabled BOOLEAN NOT NULL DEFAULT false,
  disabled_reason TEXT,
  disabled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton_check CHECK (singleton = true)
);

ALTER TABLE public.reputation_kill_switches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view kill switches"
  ON public.reputation_kill_switches FOR SELECT
  USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform staff can update kill switches"
  ON public.reputation_kill_switches FOR UPDATE
  USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform staff can insert kill switches"
  ON public.reputation_kill_switches FOR INSERT
  WITH CHECK (public.is_platform_user(auth.uid()));

CREATE TRIGGER update_reputation_kill_switches_updated_at
  BEFORE UPDATE ON public.reputation_kill_switches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed singleton row
INSERT INTO public.reputation_kill_switches (singleton) VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

-- Admin actions audit log
CREATE TABLE public.reputation_admin_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reputation_admin_actions_org ON public.reputation_admin_actions(target_organization_id, created_at DESC);
CREATE INDEX idx_reputation_admin_actions_actor ON public.reputation_admin_actions(actor_user_id, created_at DESC);
CREATE INDEX idx_reputation_admin_actions_type ON public.reputation_admin_actions(action_type, created_at DESC);

ALTER TABLE public.reputation_admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view admin actions"
  ON public.reputation_admin_actions FOR SELECT
  USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform staff can insert admin actions"
  ON public.reputation_admin_actions FOR INSERT
  WITH CHECK (public.is_platform_user(auth.uid()));
