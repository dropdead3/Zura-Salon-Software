
-- ─── 1. Extend pin_attempt_log with device + IP scoping ──────────
ALTER TABLE public.pin_attempt_log
  ADD COLUMN IF NOT EXISTS device_fingerprint text,
  ADD COLUMN IF NOT EXISTS ip_address text;

CREATE INDEX IF NOT EXISTS idx_pin_attempt_log_org_device_time
  ON public.pin_attempt_log (target_org_id, device_fingerprint, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_pin_attempt_log_org_time
  ON public.pin_attempt_log (target_org_id, attempted_at DESC);

-- ─── 2. validate_user_pin — per-device window + scaled org floor ─
CREATE OR REPLACE FUNCTION public.validate_user_pin(
  _organization_id uuid,
  _pin text,
  _device_fingerprint text DEFAULT NULL,
  _ip_address text DEFAULT NULL
)
 RETURNS TABLE(user_id uuid, display_name text, photo_url text, is_super_admin boolean, is_primary_owner boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_device_attempts int;
  v_org_attempts int;
  v_active_locations int;
  v_org_threshold int;
BEGIN
  -- Per-device window: 10 attempts per 5 minutes per (org, device)
  IF _device_fingerprint IS NOT NULL THEN
    SELECT count(*) INTO v_device_attempts
    FROM public.pin_attempt_log
    WHERE target_org_id = _organization_id
      AND device_fingerprint = _device_fingerprint
      AND attempted_at > now() - interval '5 minutes';

    IF v_device_attempts >= 10 THEN
      RAISE EXCEPTION 'Too many PIN attempts on this device. Please wait before trying again.';
    END IF;
  END IF;

  -- Org-wide safety floor: 10 + (active_locations * 5)
  SELECT count(*) INTO v_active_locations
  FROM public.locations
  WHERE organization_id = _organization_id
    AND is_active = true;

  v_org_threshold := 10 + COALESCE(v_active_locations, 0) * 5;

  SELECT count(*) INTO v_org_attempts
  FROM public.pin_attempt_log
  WHERE target_org_id = _organization_id
    AND attempted_at > now() - interval '5 minutes';

  IF v_org_attempts >= v_org_threshold THEN
    RAISE EXCEPTION 'Too many PIN attempts for this organization. Please wait before trying again.';
  END IF;

  INSERT INTO public.pin_attempt_log (target_org_id, device_fingerprint, ip_address)
  VALUES (_organization_id, _device_fingerprint, _ip_address);

  DELETE FROM public.pin_attempt_log WHERE attempted_at < now() - interval '1 hour';

  RETURN QUERY
  SELECT
    ep.user_id,
    COALESCE(ep.display_name, ep.full_name) as display_name,
    ep.photo_url,
    ep.is_super_admin,
    ep.is_primary_owner
  FROM public.employee_pins p
  INNER JOIN public.employee_profiles ep ON ep.user_id = p.user_id
  WHERE ep.organization_id = _organization_id
    AND p.login_pin = extensions.crypt(_pin, p.login_pin)
    AND ep.is_active = true
    AND ep.is_approved = true
  LIMIT 1;
END;
$function$;

-- ─── 3. validate_dock_pin — same device-scoped pattern ───────────
CREATE OR REPLACE FUNCTION public.validate_dock_pin(
  _pin text,
  _organization_id uuid DEFAULT NULL,
  _device_fingerprint text DEFAULT NULL,
  _ip_address text DEFAULT NULL
)
 RETURNS TABLE(user_id uuid, display_name text, photo_url text, location_id text, organization_id uuid, location_ids text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_device_attempts int;
  v_org_attempts int;
  v_active_locations int;
  v_org_threshold int;
  v_rate_org_id uuid := COALESCE(_organization_id, '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  IF _device_fingerprint IS NOT NULL THEN
    SELECT count(*) INTO v_device_attempts
    FROM public.pin_attempt_log
    WHERE target_org_id = v_rate_org_id
      AND device_fingerprint = _device_fingerprint
      AND attempted_at > now() - interval '5 minutes';

    IF v_device_attempts >= 10 THEN
      RAISE EXCEPTION 'Too many PIN attempts on this device. Please wait before trying again.';
    END IF;
  END IF;

  IF _organization_id IS NOT NULL THEN
    SELECT count(*) INTO v_active_locations
    FROM public.locations
    WHERE organization_id = _organization_id
      AND is_active = true;
    v_org_threshold := 10 + COALESCE(v_active_locations, 0) * 5;
  ELSE
    v_org_threshold := 10;
  END IF;

  SELECT count(*) INTO v_org_attempts
  FROM public.pin_attempt_log
  WHERE target_org_id = v_rate_org_id
    AND attempted_at > now() - interval '5 minutes';

  IF v_org_attempts >= v_org_threshold THEN
    RAISE EXCEPTION 'Too many PIN attempts for this organization. Please wait before trying again.';
  END IF;

  INSERT INTO public.pin_attempt_log (target_org_id, device_fingerprint, ip_address)
  VALUES (v_rate_org_id, _device_fingerprint, _ip_address);

  DELETE FROM public.pin_attempt_log WHERE attempted_at < now() - interval '1 hour';

  RETURN QUERY
  SELECT
    ep.user_id,
    COALESCE(ep.display_name, ep.full_name) as display_name,
    ep.photo_url,
    ep.location_id,
    ep.organization_id,
    COALESCE(ep.location_ids, ARRAY[]::text[]) as location_ids
  FROM public.employee_pins p
  INNER JOIN public.employee_profiles ep ON ep.user_id = p.user_id
  WHERE p.login_pin = extensions.crypt(_pin, p.login_pin)
    AND ep.is_active = true
    AND ep.is_approved = true
    AND (_organization_id IS NULL OR ep.organization_id = _organization_id)
  LIMIT 1;
END;
$function$;
