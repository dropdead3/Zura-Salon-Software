-- ─── 1. Add surface column to pin_attempt_log ─────────────────────
ALTER TABLE public.pin_attempt_log
  ADD COLUMN IF NOT EXISTS surface text NOT NULL DEFAULT 'login';

-- Constrain to known surfaces (drop+recreate so it's idempotent)
ALTER TABLE public.pin_attempt_log
  DROP CONSTRAINT IF EXISTS pin_attempt_log_surface_check;
ALTER TABLE public.pin_attempt_log
  ADD CONSTRAINT pin_attempt_log_surface_check
  CHECK (surface IN ('login', 'dock'));

-- Composite index for surface-scoped lookups
CREATE INDEX IF NOT EXISTS idx_pin_attempt_log_org_surface_device_time
  ON public.pin_attempt_log (target_org_id, surface, device_fingerprint, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_pin_attempt_log_org_surface_time
  ON public.pin_attempt_log (target_org_id, surface, attempted_at DESC);

-- ─── 2. validate_user_pin: add _surface parameter ─────────────────
DROP FUNCTION IF EXISTS public.validate_user_pin(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.validate_user_pin(
  _organization_id uuid,
  _pin text,
  _device_fingerprint text DEFAULT NULL,
  _ip_address text DEFAULT NULL,
  _surface text DEFAULT 'login'
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
  v_surface text := COALESCE(_surface, 'login');
BEGIN
  IF v_surface NOT IN ('login', 'dock') THEN
    v_surface := 'login';
  END IF;

  -- Per-device window: 10 attempts per 5 minutes per (org, device, surface)
  IF _device_fingerprint IS NOT NULL THEN
    SELECT count(*), min(attempted_at)
      INTO v_device_attempts, v_device_oldest
    FROM public.pin_attempt_log
    WHERE target_org_id = _organization_id
      AND device_fingerprint = _device_fingerprint
      AND surface = v_surface
      AND attempted_at > now() - interval '5 minutes';

    IF v_device_attempts >= 10 THEN
      v_lockout_until := v_device_oldest + interval '5 minutes';
    END IF;
  END IF;

  -- Org-wide safety floor
  SELECT count(*) INTO v_active_locations
  FROM public.locations
  WHERE organization_id = _organization_id
    AND is_active = true;

  v_org_threshold := 10 + COALESCE(v_active_locations, 0) * 5;

  SELECT count(*), min(attempted_at)
    INTO v_org_attempts, v_org_oldest
  FROM public.pin_attempt_log
  WHERE target_org_id = _organization_id
    AND surface = v_surface
    AND attempted_at > now() - interval '5 minutes';

  IF v_org_attempts >= v_org_threshold THEN
    v_lockout_until := GREATEST(
      COALESCE(v_lockout_until, v_org_oldest + interval '5 minutes'),
      v_org_oldest + interval '5 minutes'
    );
  END IF;

  IF v_lockout_until IS NOT NULL THEN
    RETURN QUERY SELECT
      NULL::uuid, NULL::text, NULL::text,
      NULL::boolean, NULL::boolean,
      v_lockout_until;
    RETURN;
  END IF;

  INSERT INTO public.pin_attempt_log (target_org_id, device_fingerprint, ip_address, surface)
  VALUES (_organization_id, _device_fingerprint, _ip_address, v_surface);

  DELETE FROM public.pin_attempt_log WHERE attempted_at < now() - interval '1 hour';

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

-- ─── 3. validate_dock_pin: structured lockout return + surface scoping ─
DROP FUNCTION IF EXISTS public.validate_dock_pin(text, uuid, text, text);

CREATE OR REPLACE FUNCTION public.validate_dock_pin(
  _pin text,
  _organization_id uuid DEFAULT NULL,
  _device_fingerprint text DEFAULT NULL,
  _ip_address text DEFAULT NULL
)
 RETURNS TABLE(
   user_id uuid,
   display_name text,
   photo_url text,
   location_id text,
   organization_id uuid,
   location_ids text[],
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
  v_rate_org_id uuid := COALESCE(_organization_id, '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  -- Per-device window scoped to the dock surface
  IF _device_fingerprint IS NOT NULL THEN
    SELECT count(*), min(attempted_at)
      INTO v_device_attempts, v_device_oldest
    FROM public.pin_attempt_log
    WHERE target_org_id = v_rate_org_id
      AND device_fingerprint = _device_fingerprint
      AND surface = 'dock'
      AND attempted_at > now() - interval '5 minutes';

    IF v_device_attempts >= 10 THEN
      v_lockout_until := v_device_oldest + interval '5 minutes';
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

  SELECT count(*), min(attempted_at)
    INTO v_org_attempts, v_org_oldest
  FROM public.pin_attempt_log
  WHERE target_org_id = v_rate_org_id
    AND surface = 'dock'
    AND attempted_at > now() - interval '5 minutes';

  IF v_org_attempts >= v_org_threshold THEN
    v_lockout_until := GREATEST(
      COALESCE(v_lockout_until, v_org_oldest + interval '5 minutes'),
      v_org_oldest + interval '5 minutes'
    );
  END IF;

  -- Locked: return single row with only lockout_until populated
  IF v_lockout_until IS NOT NULL THEN
    RETURN QUERY SELECT
      NULL::uuid, NULL::text, NULL::text,
      NULL::text, NULL::uuid, NULL::text[],
      v_lockout_until;
    RETURN;
  END IF;

  INSERT INTO public.pin_attempt_log (target_org_id, device_fingerprint, ip_address, surface)
  VALUES (v_rate_org_id, _device_fingerprint, _ip_address, 'dock');

  DELETE FROM public.pin_attempt_log WHERE attempted_at < now() - interval '1 hour';

  RETURN QUERY
  SELECT
    ep.user_id,
    COALESCE(ep.display_name, ep.full_name) as display_name,
    ep.photo_url,
    ep.location_id,
    ep.organization_id,
    COALESCE(ep.location_ids, ARRAY[]::text[]) as location_ids,
    NULL::timestamptz as lockout_until
  FROM public.employee_pins p
  INNER JOIN public.employee_profiles ep ON ep.user_id = p.user_id
  WHERE p.login_pin = extensions.crypt(_pin, p.login_pin)
    AND ep.is_active = true
    AND ep.is_approved = true
    AND (_organization_id IS NULL OR ep.organization_id = _organization_id)
  LIMIT 1;
END;
$function$;