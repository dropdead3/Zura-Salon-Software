-- Replace validate_user_pin so lockouts are returned as a structured row
-- (lockout_until populated, identity null) instead of raised as exceptions.
-- Keeps the same input signature so existing callers continue to work.

DROP FUNCTION IF EXISTS public.validate_user_pin(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.validate_user_pin(
  _organization_id uuid,
  _pin text,
  _device_fingerprint text DEFAULT NULL,
  _ip_address text DEFAULT NULL
)
 RETURNS TABLE(
   user_id uuid,
   display_name text,
   photo_url text,
   is_super_admin boolean,
   is_primary_owner boolean,
   lockout_until timestamptz
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_device_attempts int;
  v_org_attempts int;
  v_active_locations int;
  v_org_threshold int;
  v_device_oldest timestamptz;
  v_org_oldest timestamptz;
  v_lockout_until timestamptz := NULL;
BEGIN
  -- Per-device window: 10 attempts per 5 minutes per (org, device)
  IF _device_fingerprint IS NOT NULL THEN
    SELECT count(*), min(attempted_at)
      INTO v_device_attempts, v_device_oldest
    FROM public.pin_attempt_log
    WHERE target_org_id = _organization_id
      AND device_fingerprint = _device_fingerprint
      AND attempted_at > now() - interval '5 minutes';

    IF v_device_attempts >= 10 THEN
      v_lockout_until := v_device_oldest + interval '5 minutes';
    END IF;
  END IF;

  -- Org-wide safety floor: 10 + (active_locations * 5) per 5 minutes
  SELECT count(*) INTO v_active_locations
  FROM public.locations
  WHERE organization_id = _organization_id
    AND is_active = true;

  v_org_threshold := 10 + COALESCE(v_active_locations, 0) * 5;

  SELECT count(*), min(attempted_at)
    INTO v_org_attempts, v_org_oldest
  FROM public.pin_attempt_log
  WHERE target_org_id = _organization_id
    AND attempted_at > now() - interval '5 minutes';

  IF v_org_attempts >= v_org_threshold THEN
    v_lockout_until := GREATEST(
      COALESCE(v_lockout_until, v_org_oldest + interval '5 minutes'),
      v_org_oldest + interval '5 minutes'
    );
  END IF;

  -- If locked out, return a single row with only lockout_until populated
  IF v_lockout_until IS NOT NULL THEN
    RETURN QUERY SELECT
      NULL::uuid,
      NULL::text,
      NULL::text,
      NULL::boolean,
      NULL::boolean,
      v_lockout_until;
    RETURN;
  END IF;

  -- Not locked — log this attempt and prune old rows
  INSERT INTO public.pin_attempt_log (target_org_id, device_fingerprint, ip_address)
  VALUES (_organization_id, _device_fingerprint, _ip_address);

  DELETE FROM public.pin_attempt_log WHERE attempted_at < now() - interval '1 hour';

  -- Return the matching identity (or no rows if PIN didn't match)
  RETURN QUERY
  SELECT
    ep.user_id,
    COALESCE(ep.display_name, ep.full_name) as display_name,
    ep.photo_url,
    ep.is_super_admin,
    ep.is_primary_owner,
    NULL::timestamptz as lockout_until
  FROM public.employee_pins p
  INNER JOIN public.employee_profiles ep ON ep.user_id = p.user_id
  WHERE ep.organization_id = _organization_id
    AND p.login_pin = extensions.crypt(_pin, p.login_pin)
    AND ep.is_active = true
    AND ep.is_approved = true
  LIMIT 1;
END;
$function$;