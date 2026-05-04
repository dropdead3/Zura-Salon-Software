-- user_ui_preferences: per-user, per-surface key-value scratch space for
-- dismissible nudges, snooze states, "do not show again" flags, etc.
--
-- Rationale: client-side localStorage doesn't follow operators across
-- devices. We don't need a full notifications row for things that aren't
-- broadcast — just a tiny user-scoped bucket the client owns.
--
-- Surface convention: kebab-case, namespaced. Examples:
--   reputation.gbp-grace-snooze
--   onboarding.welcome-tour-dismissed
--
-- Value: arbitrary JSONB. Each surface defines its own shape.
CREATE TABLE IF NOT EXISTS public.user_ui_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  surface TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, surface)
);

CREATE INDEX IF NOT EXISTS idx_user_ui_preferences_user_surface
  ON public.user_ui_preferences (user_id, surface);

ALTER TABLE public.user_ui_preferences ENABLE ROW LEVEL SECURITY;

-- A user can only see / write their own preferences. No cross-user reads
-- even within an org — these are personal scratch state.
CREATE POLICY "Users read their own UI preferences"
  ON public.user_ui_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own UI preferences"
  ON public.user_ui_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own UI preferences"
  ON public.user_ui_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own UI preferences"
  ON public.user_ui_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Standard updated_at trigger.
CREATE TRIGGER update_user_ui_preferences_updated_at
  BEFORE UPDATE ON public.user_ui_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();