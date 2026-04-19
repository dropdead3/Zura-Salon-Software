-- Wave 5: Service Catalog Audit Log
-- Records material changes to services + form linkage so operators have a
-- compliance trail when prices/durations/forms change.

CREATE TABLE IF NOT EXISTS public.service_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  -- e.g. 'price_changed', 'duration_changed', 'archived', 'restored',
  -- 'category_changed', 'form_attached', 'form_detached', 'form_requirement_changed'
  field_name TEXT,
  previous_value JSONB,
  new_value JSONB,
  metadata JSONB,
  actor_user_id UUID,
  actor_name TEXT,
  source TEXT NOT NULL DEFAULT 'editor', -- 'editor' | 'bulk_edit' | 'system'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_audit_log_service_id
  ON public.service_audit_log(service_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_audit_log_organization_id
  ON public.service_audit_log(organization_id, created_at DESC);

ALTER TABLE public.service_audit_log ENABLE ROW LEVEL SECURITY;

-- Members of the organization can read audit history for their org's services
CREATE POLICY "Org members can view service audit log"
  ON public.service_audit_log FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Inserts only via SECURITY DEFINER triggers (no direct client writes).
-- Platform users may insert for backfills/admin tools.
CREATE POLICY "Platform users can insert service audit entries"
  ON public.service_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_user(auth.uid()));

-- ─── Trigger: auto-log material services UPDATEs ──────────────────
CREATE OR REPLACE FUNCTION public.log_service_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_name TEXT;
BEGIN
  -- Resolve actor name (best-effort)
  SELECT COALESCE(display_name, full_name) INTO v_actor_name
  FROM public.employee_profiles
  WHERE user_id = v_actor
  LIMIT 1;

  -- Price
  IF COALESCE(OLD.price, 0) IS DISTINCT FROM COALESCE(NEW.price, 0) THEN
    INSERT INTO public.service_audit_log
      (organization_id, service_id, event_type, field_name,
       previous_value, new_value, actor_user_id, actor_name, source)
    VALUES
      (NEW.organization_id, NEW.id, 'price_changed', 'price',
       to_jsonb(OLD.price), to_jsonb(NEW.price), v_actor, v_actor_name, 'editor');
  END IF;

  -- Duration
  IF COALESCE(OLD.duration_minutes, 0) IS DISTINCT FROM COALESCE(NEW.duration_minutes, 0) THEN
    INSERT INTO public.service_audit_log
      (organization_id, service_id, event_type, field_name,
       previous_value, new_value, actor_user_id, actor_name, source)
    VALUES
      (NEW.organization_id, NEW.id, 'duration_changed', 'duration_minutes',
       to_jsonb(OLD.duration_minutes), to_jsonb(NEW.duration_minutes),
       v_actor, v_actor_name, 'editor');
  END IF;

  -- Cost
  IF COALESCE(OLD.cost, 0) IS DISTINCT FROM COALESCE(NEW.cost, 0) THEN
    INSERT INTO public.service_audit_log
      (organization_id, service_id, event_type, field_name,
       previous_value, new_value, actor_user_id, actor_name, source)
    VALUES
      (NEW.organization_id, NEW.id, 'cost_changed', 'cost',
       to_jsonb(OLD.cost), to_jsonb(NEW.cost), v_actor, v_actor_name, 'editor');
  END IF;

  -- Category
  IF COALESCE(OLD.category, '') IS DISTINCT FROM COALESCE(NEW.category, '') THEN
    INSERT INTO public.service_audit_log
      (organization_id, service_id, event_type, field_name,
       previous_value, new_value, actor_user_id, actor_name, source)
    VALUES
      (NEW.organization_id, NEW.id, 'category_changed', 'category',
       to_jsonb(OLD.category), to_jsonb(NEW.category), v_actor, v_actor_name, 'editor');
  END IF;

  -- is_active
  IF COALESCE(OLD.is_active, true) IS DISTINCT FROM COALESCE(NEW.is_active, true) THEN
    INSERT INTO public.service_audit_log
      (organization_id, service_id, event_type, field_name,
       previous_value, new_value, actor_user_id, actor_name, source)
    VALUES
      (NEW.organization_id, NEW.id,
       CASE WHEN NEW.is_active THEN 'activated' ELSE 'deactivated' END,
       'is_active',
       to_jsonb(OLD.is_active), to_jsonb(NEW.is_active),
       v_actor, v_actor_name, 'editor');
  END IF;

  -- is_archived
  IF COALESCE(OLD.is_archived, false) IS DISTINCT FROM COALESCE(NEW.is_archived, false) THEN
    INSERT INTO public.service_audit_log
      (organization_id, service_id, event_type, field_name,
       previous_value, new_value, actor_user_id, actor_name, source)
    VALUES
      (NEW.organization_id, NEW.id,
       CASE WHEN NEW.is_archived THEN 'archived' ELSE 'restored' END,
       'is_archived',
       to_jsonb(OLD.is_archived), to_jsonb(NEW.is_archived),
       v_actor, v_actor_name, 'editor');
  END IF;

  -- bookable_online
  IF COALESCE(OLD.bookable_online, true) IS DISTINCT FROM COALESCE(NEW.bookable_online, true) THEN
    INSERT INTO public.service_audit_log
      (organization_id, service_id, event_type, field_name,
       previous_value, new_value, actor_user_id, actor_name, source)
    VALUES
      (NEW.organization_id, NEW.id, 'bookable_online_changed', 'bookable_online',
       to_jsonb(OLD.bookable_online), to_jsonb(NEW.bookable_online),
       v_actor, v_actor_name, 'editor');
  END IF;

  -- patch_test_required
  IF COALESCE(OLD.patch_test_required, false) IS DISTINCT FROM COALESCE(NEW.patch_test_required, false) THEN
    INSERT INTO public.service_audit_log
      (organization_id, service_id, event_type, field_name,
       previous_value, new_value, actor_user_id, actor_name, source)
    VALUES
      (NEW.organization_id, NEW.id, 'patch_test_changed', 'patch_test_required',
       to_jsonb(OLD.patch_test_required), to_jsonb(NEW.patch_test_required),
       v_actor, v_actor_name, 'editor');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_service_changes ON public.services;
CREATE TRIGGER trg_log_service_changes
  AFTER UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.log_service_changes();

-- ─── Trigger: auto-log form linkage changes ───────────────────────
CREATE OR REPLACE FUNCTION public.log_service_form_requirement_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_name TEXT;
  v_org UUID;
  v_template_name TEXT;
BEGIN
  SELECT COALESCE(display_name, full_name) INTO v_actor_name
  FROM public.employee_profiles
  WHERE user_id = v_actor
  LIMIT 1;

  IF (TG_OP = 'INSERT') THEN
    SELECT organization_id INTO v_org FROM public.services WHERE id = NEW.service_id;
    SELECT name INTO v_template_name FROM public.form_templates WHERE id = NEW.form_template_id;
    IF v_org IS NOT NULL THEN
      INSERT INTO public.service_audit_log
        (organization_id, service_id, event_type, new_value,
         metadata, actor_user_id, actor_name, source)
      VALUES
        (v_org, NEW.service_id, 'form_attached',
         jsonb_build_object(
           'form_template_id', NEW.form_template_id,
           'form_template_name', v_template_name,
           'is_required', NEW.is_required,
           'signing_frequency', NEW.signing_frequency
         ),
         jsonb_build_object('requirement_id', NEW.id),
         v_actor, v_actor_name, 'editor');
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    SELECT organization_id INTO v_org FROM public.services WHERE id = NEW.service_id;
    SELECT name INTO v_template_name FROM public.form_templates WHERE id = NEW.form_template_id;
    IF v_org IS NOT NULL AND (
       OLD.is_required IS DISTINCT FROM NEW.is_required OR
       OLD.signing_frequency IS DISTINCT FROM NEW.signing_frequency
    ) THEN
      INSERT INTO public.service_audit_log
        (organization_id, service_id, event_type,
         previous_value, new_value, metadata,
         actor_user_id, actor_name, source)
      VALUES
        (v_org, NEW.service_id, 'form_requirement_changed',
         jsonb_build_object(
           'is_required', OLD.is_required,
           'signing_frequency', OLD.signing_frequency
         ),
         jsonb_build_object(
           'is_required', NEW.is_required,
           'signing_frequency', NEW.signing_frequency
         ),
         jsonb_build_object(
           'form_template_id', NEW.form_template_id,
           'form_template_name', v_template_name,
           'requirement_id', NEW.id
         ),
         v_actor, v_actor_name, 'editor');
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    SELECT organization_id INTO v_org FROM public.services WHERE id = OLD.service_id;
    SELECT name INTO v_template_name FROM public.form_templates WHERE id = OLD.form_template_id;
    IF v_org IS NOT NULL THEN
      INSERT INTO public.service_audit_log
        (organization_id, service_id, event_type, previous_value,
         metadata, actor_user_id, actor_name, source)
      VALUES
        (v_org, OLD.service_id, 'form_detached',
         jsonb_build_object(
           'form_template_id', OLD.form_template_id,
           'form_template_name', v_template_name,
           'is_required', OLD.is_required,
           'signing_frequency', OLD.signing_frequency
         ),
         jsonb_build_object('requirement_id', OLD.id),
         v_actor, v_actor_name, 'editor');
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_form_requirement_changes ON public.service_form_requirements;
CREATE TRIGGER trg_log_form_requirement_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.service_form_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.log_service_form_requirement_changes();