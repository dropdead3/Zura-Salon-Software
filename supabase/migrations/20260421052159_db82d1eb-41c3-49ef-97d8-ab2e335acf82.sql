
-- ============================================================================
-- WAVE 1: Org Setup Questionnaire Foundations
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extend organizations table
-- ----------------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS setup_intent TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS setup_source TEXT,
  ADD COLUMN IF NOT EXISTS has_non_traditional_structure BOOLEAN NOT NULL DEFAULT false;

-- ----------------------------------------------------------------------------
-- 2. setup_step_registry (configuration table — no org scope)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.setup_step_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  step_order NUMERIC NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  applies_when JSONB NOT NULL DEFAULT '{}'::jsonb,
  depends_on TEXT[] NOT NULL DEFAULT '{}',
  unlocks TEXT[] NOT NULL DEFAULT '{}',
  component_key TEXT NOT NULL,
  commit_handler TEXT,
  step_version INTEGER NOT NULL DEFAULT 1,
  deprecated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.setup_step_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view step registry"
  ON public.setup_step_registry FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Platform users can manage step registry"
  ON public.setup_step_registry FOR ALL
  TO authenticated
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_setup_step_registry_order
  ON public.setup_step_registry(step_order)
  WHERE deprecated_at IS NULL;

CREATE TRIGGER update_setup_step_registry_updated_at
  BEFORE UPDATE ON public.setup_step_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 3. org_setup_step_completion
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_setup_step_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_version INTEGER,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  completion_source TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, step_key)
);

ALTER TABLE public.org_setup_step_completion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view step completions"
  ON public.org_setup_step_completion FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert step completions"
  ON public.org_setup_step_completion FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update step completions"
  ON public.org_setup_step_completion FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_org_setup_step_completion_org
  ON public.org_setup_step_completion(organization_id);

CREATE TRIGGER update_org_setup_step_completion_updated_at
  BEFORE UPDATE ON public.org_setup_step_completion
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. setup_conflict_rules
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.setup_conflict_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL,
  trigger_steps TEXT[] NOT NULL DEFAULT '{}',
  condition JSONB NOT NULL,
  explanation TEXT NOT NULL,
  suggested_resolution TEXT,
  resolution_step TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.setup_conflict_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view conflict rules"
  ON public.setup_conflict_rules FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Platform users can manage conflict rules"
  ON public.setup_conflict_rules FOR ALL
  TO authenticated
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));

CREATE TRIGGER update_setup_conflict_rules_updated_at
  BEFORE UPDATE ON public.setup_conflict_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. org_setup_drafts (user-scoped)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_setup_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  step_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_step TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

ALTER TABLE public.org_setup_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own draft"
  ON public.org_setup_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own draft"
  ON public.org_setup_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft"
  ON public.org_setup_drafts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own draft"
  ON public.org_setup_drafts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_org_setup_drafts_user
  ON public.org_setup_drafts(user_id, organization_id);

CREATE TRIGGER update_org_setup_drafts_updated_at
  BEFORE UPDATE ON public.org_setup_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6. org_setup_commit_log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_setup_commit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  system TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  deep_link TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_conflicts JSONB NOT NULL DEFAULT '[]'::jsonb,
  attempted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.org_setup_commit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view commit log"
  ON public.org_setup_commit_log FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert commit log"
  ON public.org_setup_commit_log FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_org_setup_commit_log_org
  ON public.org_setup_commit_log(organization_id, attempted_at DESC);

-- ----------------------------------------------------------------------------
-- 7. org_setup_step_events (telemetry)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_setup_step_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  step_key TEXT NOT NULL,
  step_number NUMERIC,
  event TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_setup_step_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view step events"
  ON public.org_setup_step_events FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can insert step events"
  ON public.org_setup_step_events FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Platform users can view all step events"
  ON public.org_setup_step_events FOR SELECT
  USING (public.is_platform_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_org_setup_step_events_org_time
  ON public.org_setup_step_events(organization_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_setup_step_events_step_event
  ON public.org_setup_step_events(step_key, event);

-- ----------------------------------------------------------------------------
-- 8. app_interest
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  app_key TEXT NOT NULL,
  expressed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  surfaced_until TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  expressed_by UUID REFERENCES auth.users(id),
  UNIQUE (organization_id, app_key)
);

ALTER TABLE public.app_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view app interest"
  ON public.app_interest FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert app interest"
  ON public.app_interest FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete app interest"
  ON public.app_interest FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_app_interest_org
  ON public.app_interest(organization_id, surfaced_until);

-- ----------------------------------------------------------------------------
-- 9. setup_unmodeled_structures
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.setup_unmodeled_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  raw_description TEXT NOT NULL,
  suggested_fit TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reported_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.setup_unmodeled_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view unmodeled structures"
  ON public.setup_unmodeled_structures FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert unmodeled structures"
  ON public.setup_unmodeled_structures FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Platform users can view all unmodeled structures"
  ON public.setup_unmodeled_structures FOR SELECT
  USING (public.is_platform_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_setup_unmodeled_structures_org
  ON public.setup_unmodeled_structures(organization_id, occurred_at DESC);

-- ----------------------------------------------------------------------------
-- 10. setup_pause_events
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.setup_pause_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  step_key TEXT NOT NULL,
  reason_chip TEXT,
  free_text TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resumed_at TIMESTAMPTZ
);

ALTER TABLE public.setup_pause_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view pause events"
  ON public.setup_pause_events FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert pause events"
  ON public.setup_pause_events FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update pause events"
  ON public.setup_pause_events FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Platform users can view all pause events"
  ON public.setup_pause_events FOR SELECT
  USING (public.is_platform_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_setup_pause_events_org
  ON public.setup_pause_events(organization_id, occurred_at DESC);

-- ----------------------------------------------------------------------------
-- 11. policy_org_profile: add backfill_inferences (if table exists)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'policy_org_profile'
  ) THEN
    ALTER TABLE public.policy_org_profile
      ADD COLUMN IF NOT EXISTS backfill_inferences JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 12. Seed step registry
-- ----------------------------------------------------------------------------
INSERT INTO public.setup_step_registry (key, title, step_order, required, component_key, commit_handler, depends_on, unlocks)
VALUES
  ('step_0_fit_check', 'Does this sound like your salon?', 0, false, 'Step0FitCheck', NULL, '{}', '{}'),
  ('step_1_identity', 'Business identity', 1, true, 'Step1Identity', 'commit-step-identity', '{}', ARRAY['dashboard_clock', 'org_branding']),
  ('step_2_footprint', 'Locations and footprint', 2, true, 'Step2Footprint', 'commit-step-footprint', ARRAY['step_1_identity'], ARRAY['cross_location_benchmarking']),
  ('step_3_team', 'Your team', 3, true, 'Step3Team', 'commit-step-team', ARRAY['step_2_footprint'], ARRAY['stylist_levels', 'career_pathway']),
  ('step_4_compensation', 'How you pay people', 4, true, 'Step4Compensation', 'commit-step-compensation', ARRAY['step_3_team'], ARRAY['commission_breach_detection', 'payroll_engine']),
  ('step_5_catalog', 'Service catalog', 5, true, 'Step5Catalog', 'commit-step-catalog', ARRAY['step_2_footprint'], ARRAY['service_catalog', 'color_bar_eligibility']),
  ('step_6_standards', 'Operating standards', 6, false, 'Step6Standards', 'commit-step-standards', ARRAY['step_4_compensation'], ARRAY['policy_engine', 'tip_distribution']),
  ('step_7_intent', 'What you want from {{PLATFORM_NAME}}', 7, false, 'Step7Intent', 'commit-step-intent', '{}', ARRAY['sidebar_persona', 'recommendation_engine']),
  ('step_7_5_apps', 'Recommended apps', 7.5, false, 'Step7_5AppRecommendations', 'commit-step-apps', ARRAY['step_4_compensation', 'step_5_catalog'], ARRAY['app_marketplace_seeded'])
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 13. Seed conflict rules (12 representative rules)
-- ----------------------------------------------------------------------------
INSERT INTO public.setup_conflict_rules (key, severity, trigger_steps, condition, explanation, suggested_resolution, resolution_step)
VALUES
  ('rental_with_commission_levels', 'block', ARRAY['step_3_team', 'step_4_compensation'],
   '{"and": [{"team.has_booth_renters": true}, {"compensation.models": {"contains": "level_based"}}]}'::jsonb,
   'Booth renters cannot be on level-based commission. Renters pay you rent; they aren''t paid by you.',
   'Either remove level-based comp for renters, or reclassify them as W-2 commission staff.',
   'step_4_compensation'),

  ('apprentices_without_mentor_comp', 'warn', ARRAY['step_3_team', 'step_4_compensation'],
   '{"and": [{"team.has_apprentices": true}, {"compensation.models": {"not_contains": "hourly"}}]}'::jsonb,
   'Apprentices typically need an hourly compensation track until they earn their chair.',
   'Add an hourly tier to your compensation models for apprentices.',
   'step_4_compensation'),

  ('color_services_no_color_bar', 'inform', ARRAY['step_5_catalog'],
   '{"catalog.categories": {"contains": "color"}}'::jsonb,
   'You offer color services. Zura Color Bar can manage formulas, stock, and per-service margin.',
   'Color Bar will be recommended in the apps step.',
   'step_7_5_apps'),

  ('multi_location_no_benchmarking_intent', 'inform', ARRAY['step_2_footprint', 'step_7_intent'],
   '{"and": [{"footprint.location_count": {"gte": 2}}, {"intent": {"not_contains": "benchmarking"}}]}'::jsonb,
   'You have multiple locations but didn''t select benchmarking as a goal. Cross-location intelligence is one of the strongest reasons multi-location operators use {{PLATFORM_NAME}}.',
   'Consider adding benchmarking to your intent.',
   'step_7_intent'),

  ('serves_minors_no_consent_policy', 'warn', ARRAY['step_5_catalog', 'step_6_standards'],
   '{"and": [{"catalog.serves_minors": true}, {"standards.has_minor_consent_policy": false}]}'::jsonb,
   'Serving minors typically requires guardian consent on file before chemical services.',
   'A minor consent policy will be added to your policy profile after setup.',
   'step_6_standards'),

  ('tips_pooled_without_distribution_rule', 'block', ARRAY['step_6_standards'],
   '{"and": [{"standards.tip_handling": "pooled"}, {"standards.tip_distribution_rule": null}]}'::jsonb,
   'Pooled tips require a distribution rule. Without one, payroll cannot calculate fair payouts.',
   'Choose a tip distribution method (equal, hours-weighted, or service-weighted).',
   'step_6_standards'),

  ('retail_no_commission_basis', 'warn', ARRAY['step_5_catalog', 'step_6_standards'],
   '{"and": [{"catalog.sells_retail": true}, {"standards.retail_commission_basis": null}]}'::jsonb,
   'You sell retail but haven''t set a retail commission basis. Default is 10% of net retail.',
   'Set a retail commission basis or accept the default in setup.',
   'step_6_standards'),

  ('memberships_without_recurring_billing_intent', 'inform', ARRAY['step_5_catalog'],
   '{"catalog.has_memberships": true}'::jsonb,
   'You offer memberships. Recurring billing and member-only pricing will be configured automatically.',
   'No action required — membership infrastructure activates on commit.',
   NULL),

  ('non_traditional_with_strict_compensation', 'inform', ARRAY['step_0_fit_check', 'step_4_compensation'],
   '{"and": [{"fit_check.is_non_traditional": true}, {"compensation.models": {"length": 1}}]}'::jsonb,
   'You flagged a non-traditional structure but selected a single conventional comp model. You can mix multiple plans per staff member after setup.',
   'Compensation Hub will surface a customization callout for you.',
   NULL),

  ('packages_no_redemption_tracking', 'warn', ARRAY['step_5_catalog'],
   '{"and": [{"catalog.has_packages": true}, {"catalog.tracks_package_redemption": false}]}'::jsonb,
   'Packages without redemption tracking risk over-delivery and revenue leakage.',
   'Enable package redemption tracking on commit.',
   'step_5_catalog'),

  ('large_team_no_stylist_levels', 'inform', ARRAY['step_3_team', 'step_4_compensation'],
   '{"and": [{"team.size_band": "10_to_25"}, {"compensation.models": {"not_contains": "level_based"}}]}'::jsonb,
   'Teams of 10+ typically benefit from a stylist level ladder for retention and progression clarity.',
   'Consider adding a level-based track. You can configure this later.',
   NULL),

  ('intent_growth_no_marketing_apps', 'inform', ARRAY['step_7_intent', 'step_7_5_apps'],
   '{"and": [{"intent": {"contains": "growth"}}, {"apps.selected": {"not_contains": "marketing_os"}}]}'::jsonb,
   'You selected growth as an intent. {{MARKETING_OS_NAME}} is the strongest lever for new client acquisition.',
   '{{MARKETING_OS_NAME}} will be pre-checked in the apps step.',
   'step_7_5_apps')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 14. backfill_org_setup_profile function (idempotent, only fills NULLs)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.backfill_org_setup_profile(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _location_count INTEGER;
  _employee_count INTEGER;
  _has_appointments BOOLEAN;
  _inferences JSONB := '{}'::jsonb;
  _current_setup_completed_at TIMESTAMPTZ;
BEGIN
  SELECT setup_completed_at INTO _current_setup_completed_at
  FROM public.organizations
  WHERE id = _org_id;

  IF _current_setup_completed_at IS NOT NULL THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already_completed');
  END IF;

  SELECT COUNT(*) INTO _location_count
  FROM public.locations
  WHERE organization_id = _org_id;

  SELECT COUNT(*) INTO _employee_count
  FROM public.employee_profiles
  WHERE organization_id = _org_id;

  SELECT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE organization_id = _org_id
    LIMIT 1
  ) INTO _has_appointments;

  -- Only stamp setup_source if not already set
  UPDATE public.organizations
  SET
    setup_source = COALESCE(setup_source, 'heuristic_backfill'),
    setup_completed_at = COALESCE(setup_completed_at,
      CASE WHEN _has_appointments THEN now() ELSE NULL END
    )
  WHERE id = _org_id
    AND setup_completed_at IS NULL;

  _inferences := jsonb_build_object(
    'location_count', _location_count,
    'employee_count', _employee_count,
    'has_appointments', _has_appointments,
    'inferred_at', now()
  );

  -- Update policy_org_profile if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'policy_org_profile'
  ) THEN
    UPDATE public.policy_org_profile
    SET backfill_inferences = COALESCE(backfill_inferences, '{}'::jsonb) || _inferences
    WHERE organization_id = _org_id;
  END IF;

  RETURN _inferences;
END;
$$;
