
-- Trigger function: insert platform_notification when a coach is assigned
CREATE OR REPLACE FUNCTION public.notify_coach_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_name TEXT;
BEGIN
  SELECT name INTO v_org_name FROM public.organizations WHERE id = NEW.organization_id;

  INSERT INTO public.platform_notifications (
    recipient_id,
    type,
    severity,
    title,
    message,
    metadata,
    link
  ) VALUES (
    NEW.coach_user_id,
    'coach_assigned',
    'info',
    'New Organization Assignment',
    'You have been assigned as coach for ' || COALESCE(v_org_name, 'an organization') || '.',
    jsonb_build_object('organization_id', NEW.organization_id, 'organization_name', COALESCE(v_org_name, '')),
    '/dashboard/platform/coach'
  );

  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_notify_coach_on_assignment
  AFTER INSERT ON public.backroom_coach_assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_coach_on_assignment();
