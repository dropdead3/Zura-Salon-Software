-- 1. Tighten SELECT to org admins only (price history is sensitive)
DROP POLICY IF EXISTS "Org members can view service audit log" ON public.service_audit_log;
DROP POLICY IF EXISTS "Org admins can view service audit log" ON public.service_audit_log;

CREATE POLICY "Org admins can view service audit log"
  ON public.service_audit_log
  FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

-- 2. Replace platform-only insert policy with org-member policy
DROP POLICY IF EXISTS "Platform users can insert service audit entries" ON public.service_audit_log;
DROP POLICY IF EXISTS "Org members can insert service audit entries" ON public.service_audit_log;

CREATE POLICY "Org members can insert service audit entries"
  ON public.service_audit_log
  FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 3. Add INSERT trigger for service creation events
CREATE OR REPLACE FUNCTION public.log_service_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_name TEXT;
BEGIN
  SELECT COALESCE(display_name, full_name) INTO v_actor_name
  FROM public.employee_profiles
  WHERE user_id = v_actor
  LIMIT 1;

  INSERT INTO public.service_audit_log
    (organization_id, service_id, event_type, field_name,
     previous_value, new_value, metadata, actor_user_id, actor_name, source)
  VALUES
    (NEW.organization_id, NEW.id, 'created', NULL,
     NULL,
     jsonb_build_object(
       'name', NEW.name,
       'price', NEW.price,
       'duration_minutes', NEW.duration_minutes,
       'category', NEW.category,
       'cost', NEW.cost
     ),
     NULL,
     v_actor, v_actor_name, 'editor');

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_log_service_created ON public.services;
CREATE TRIGGER trg_log_service_created
  AFTER INSERT ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.log_service_created();