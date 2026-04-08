
CREATE OR REPLACE FUNCTION public.cleanup_scheduled_report_recipients()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_report RECORD;
  v_new_recipients JSONB;
  v_user_id UUID;
  v_user_email TEXT;
  v_org_id UUID;
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true) THEN
    v_user_id := NEW.user_id;
    v_user_email := COALESCE(NEW.email, '');
    v_org_id := NEW.organization_id;
  ELSIF (TG_OP = 'DELETE') THEN
    v_user_id := OLD.user_id;
    v_user_email := COALESCE(OLD.email, '');
    v_org_id := OLD.organization_id;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  FOR v_report IN
    SELECT id, recipients, created_by, name
    FROM public.scheduled_reports
    WHERE organization_id = v_org_id
      AND is_active = true
      AND recipients IS NOT NULL
      AND jsonb_array_length(recipients) > 0
  LOOP
    v_new_recipients := (
      SELECT COALESCE(jsonb_agg(r), '[]'::jsonb)
      FROM jsonb_array_elements(v_report.recipients) r
      WHERE (r->>'userId' IS DISTINCT FROM v_user_id::text)
        AND (v_user_email = '' OR r->>'email' IS DISTINCT FROM v_user_email)
    );

    IF v_new_recipients IS DISTINCT FROM v_report.recipients THEN
      UPDATE public.scheduled_reports
      SET recipients = v_new_recipients,
          is_active = CASE WHEN jsonb_array_length(v_new_recipients) = 0 THEN false ELSE is_active END
      WHERE id = v_report.id;

      INSERT INTO public.platform_notifications (
        recipient_id, type, severity, title, message, link
      ) VALUES (
        v_report.created_by,
        'scheduled_report_recipient_removed',
        'warning',
        'Scheduled Report Updated',
        'A recipient was removed from "' || v_report.name || '" because they are no longer active.',
        '/dashboard/admin/reports'
      );
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_cleanup_scheduled_recipients
AFTER UPDATE OF is_active OR DELETE ON public.employee_profiles
FOR EACH ROW EXECUTE FUNCTION public.cleanup_scheduled_report_recipients();
