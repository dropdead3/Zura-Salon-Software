
-- ============================================================================
-- Reputation Engine Phase 1
-- ============================================================================

-- 1. recovery_tasks ----------------------------------------------------------
CREATE TABLE public.recovery_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  feedback_response_id UUID NOT NULL REFERENCES public.client_feedback_responses(id) ON DELETE CASCADE,
  client_id UUID,
  appointment_id UUID,
  staff_user_id UUID,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'normal',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recovery_tasks_status_chk CHECK (status IN ('new','contacted','resolved','refunded','redo_booked','closed')),
  CONSTRAINT recovery_tasks_priority_chk CHECK (priority IN ('urgent','high','normal')),
  CONSTRAINT recovery_tasks_unique_per_response UNIQUE (feedback_response_id)
);
CREATE INDEX idx_recovery_tasks_org_status ON public.recovery_tasks(organization_id, status);
CREATE INDEX idx_recovery_tasks_assigned ON public.recovery_tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_recovery_tasks_response ON public.recovery_tasks(feedback_response_id);

ALTER TABLE public.recovery_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view recovery tasks"
  ON public.recovery_tasks FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage recovery tasks"
  ON public.recovery_tasks FOR ALL TO authenticated
  USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "System can insert recovery tasks"
  ON public.recovery_tasks FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- 2. location_review_settings ------------------------------------------------
CREATE TABLE public.location_review_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  google_review_url TEXT,
  apple_review_url TEXT,
  yelp_review_url TEXT,
  facebook_review_url TEXT,
  custom_review_url TEXT,
  custom_review_label TEXT,
  default_platform_priority TEXT[] NOT NULL DEFAULT ARRAY['google','apple','yelp','facebook']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT location_review_settings_unique UNIQUE (organization_id, location_id)
);
CREATE INDEX idx_location_review_settings_org ON public.location_review_settings(organization_id);

ALTER TABLE public.location_review_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read location review settings"
  ON public.location_review_settings FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage location review settings"
  ON public.location_review_settings FOR ALL TO authenticated
  USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- Public (anon) read for the public ClientFeedback page link resolution
CREATE POLICY "Public can read location review settings"
  ON public.location_review_settings FOR SELECT TO anon
  USING (true);

-- 3. review_request_automation_rules ----------------------------------------
CREATE TABLE public.review_request_automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  send_delay_minutes INTEGER NOT NULL DEFAULT 240,
  eligible_service_categories TEXT[],
  excluded_service_categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  excluded_service_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  frequency_cap_days INTEGER NOT NULL DEFAULT 90,
  stylist_inclusion_mode TEXT NOT NULL DEFAULT 'all',
  stylist_user_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  location_ids TEXT[],
  channel TEXT NOT NULL DEFAULT 'email',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rrar_stylist_mode_chk CHECK (stylist_inclusion_mode IN ('all','include','exclude')),
  CONSTRAINT rrar_channel_chk CHECK (channel IN ('email','sms','both')),
  CONSTRAINT rrar_delay_nonneg CHECK (send_delay_minutes >= 0),
  CONSTRAINT rrar_freq_pos CHECK (frequency_cap_days >= 0)
);
CREATE INDEX idx_rrar_org_active ON public.review_request_automation_rules(organization_id, is_active);

ALTER TABLE public.review_request_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view automation rules"
  ON public.review_request_automation_rules FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage automation rules"
  ON public.review_request_automation_rules FOR ALL TO authenticated
  USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- 4. review_compliance_log ---------------------------------------------------
CREATE TABLE public.review_compliance_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id UUID,
  event_type TEXT NOT NULL,
  feedback_response_id UUID,
  recovery_task_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rcl_event_chk CHECK (event_type IN (
    'request_sent','request_clicked','feedback_submitted','external_link_clicked',
    'recovery_created','recovery_status_changed','recovery_resolved',
    'rule_changed','template_changed','link_changed'
  ))
);
CREATE INDEX idx_rcl_org_created ON public.review_compliance_log(organization_id, created_at DESC);
CREATE INDEX idx_rcl_event ON public.review_compliance_log(organization_id, event_type, created_at DESC);

ALTER TABLE public.review_compliance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can read compliance log"
  ON public.review_compliance_log FOR SELECT TO authenticated
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can append compliance entries"
  ON public.review_compliance_log FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Anonymous (public ClientFeedback page) needs to insert click/submitted events
CREATE POLICY "Public can append compliance entries"
  ON public.review_compliance_log FOR INSERT TO anon
  WITH CHECK (true);

-- 5. updated_at triggers -----------------------------------------------------
CREATE TRIGGER trg_recovery_tasks_updated_at
  BEFORE UPDATE ON public.recovery_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_location_review_settings_updated_at
  BEFORE UPDATE ON public.location_review_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_rrar_updated_at
  BEFORE UPDATE ON public.review_request_automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Auto-open recovery task when low-rated feedback is submitted -----------
CREATE OR REPLACE FUNCTION public.open_recovery_task_on_low_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold INTEGER := 3;
  v_settings JSONB;
  v_priority TEXT;
  v_task_id UUID;
BEGIN
  -- Only fire when responded_at transitions from null → not null (first submission)
  IF NEW.responded_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.responded_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.overall_rating IS NULL THEN
    RETURN NEW;
  END IF;

  -- Read org-level threshold from site_settings (fallback 3)
  SELECT value INTO v_settings
  FROM public.site_settings
  WHERE id = 'review_threshold_settings'
    AND organization_id = NEW.organization_id;

  IF v_settings ? 'privateFollowUpThreshold' THEN
    v_threshold := (v_settings->>'privateFollowUpThreshold')::INTEGER;
  END IF;

  -- Always log the submission
  INSERT INTO public.review_compliance_log (organization_id, event_type, feedback_response_id, payload)
  VALUES (NEW.organization_id, 'feedback_submitted', NEW.id,
    jsonb_build_object('overall_rating', NEW.overall_rating, 'nps_score', NEW.nps_score));

  IF NEW.overall_rating > v_threshold THEN
    RETURN NEW;
  END IF;

  v_priority := CASE
    WHEN NEW.overall_rating <= 2 THEN 'urgent'
    WHEN NEW.overall_rating = 3 THEN 'high'
    ELSE 'normal'
  END;

  INSERT INTO public.recovery_tasks (
    organization_id, feedback_response_id, client_id, appointment_id, staff_user_id, priority, status
  ) VALUES (
    NEW.organization_id, NEW.id, NEW.client_id, NEW.appointment_id, NEW.staff_user_id, v_priority, 'new'
  )
  ON CONFLICT (feedback_response_id) DO NOTHING
  RETURNING id INTO v_task_id;

  IF v_task_id IS NOT NULL THEN
    INSERT INTO public.review_compliance_log (organization_id, event_type, feedback_response_id, recovery_task_id, payload)
    VALUES (NEW.organization_id, 'recovery_created', NEW.id, v_task_id,
      jsonb_build_object('overall_rating', NEW.overall_rating, 'priority', v_priority));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_open_recovery_task_on_low_feedback
  AFTER UPDATE ON public.client_feedback_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.open_recovery_task_on_low_feedback();

-- 7. Log recovery_tasks status transitions ----------------------------------
CREATE OR REPLACE FUNCTION public.log_recovery_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.review_compliance_log (
      organization_id, actor_user_id, event_type, feedback_response_id, recovery_task_id, payload
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      CASE WHEN NEW.status IN ('resolved','refunded','redo_booked','closed') THEN 'recovery_resolved'
           ELSE 'recovery_status_changed' END,
      NEW.feedback_response_id,
      NEW.id,
      jsonb_build_object('from', OLD.status, 'to', NEW.status, 'notes', NEW.resolution_notes)
    );

    IF NEW.status IN ('resolved','refunded','redo_booked','closed')
       AND OLD.status NOT IN ('resolved','refunded','redo_booked','closed') THEN
      NEW.resolved_at := COALESCE(NEW.resolved_at, now());
      NEW.resolved_by := COALESCE(NEW.resolved_by, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_recovery_task_status_change
  BEFORE UPDATE ON public.recovery_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_recovery_task_status_change();
