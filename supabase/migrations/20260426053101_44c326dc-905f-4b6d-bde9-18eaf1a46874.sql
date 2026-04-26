-- ─── 1. validate_user_pin: add attempts_remaining ──────────────────
DROP FUNCTION IF EXISTS public.validate_user_pin(uuid, text, text, text, text);

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
   lockout_until timestamptz,
   attempts_remaining int
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_device_attempts int := 0;
  v_org_attempts int;
  v_active_locations int;
  v_org_threshold int;
  v_device_oldest timestamptz;
  v_org_oldest timestamptz;
  v_lockout_until timestamptz := NULL;
  v_surface text := COALESCE(_surface, 'login');
  v_match_found boolean := false;
  v_remaining int := NULL;
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
      v_lockout_until, 0;
    RETURN;
  END IF;

  -- Check if PIN matches BEFORE inserting attempt log so we don't pad
  -- the counter on successful logins
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_pins p
    INNER JOIN public.employee_profiles ep ON ep.user_id = p.user_id
    WHERE ep.organization_id = _organization_id
      AND p.login_pin = extensions.crypt(_pin, p.login_pin)
      AND ep.is_active = true
      AND ep.is_approved = true
  ) INTO v_match_found;

  -- Only log failed attempts (successful PINs don't count toward lockout)
  IF NOT v_match_found THEN
    INSERT INTO public.pin_attempt_log (target_org_id, device_fingerprint, ip_address, surface)
    VALUES (_organization_id, _device_fingerprint, _ip_address, v_surface);

    -- attempts_remaining = 10 - (existing failed + this one just logged)
    v_remaining := GREATEST(0, 10 - v_device_attempts - 1);
  END IF;

  DELETE FROM public.pin_attempt_log WHERE attempted_at < now() - interval '1 hour';

  RETURN QUERY
  SELECT
    ep.user_id,
    COALESCE(ep.display_name, ep.full_name) as display_name,
    ep.photo_url,
    ep.is_super_admin,
    ep.is_primary_owner,
    NULL::timestamptz as lockout_until,
    v_remaining as attempts_remaining
  FROM public.employee_pins p
  INNER JOIN public.employee_profiles ep ON ep.user_id = p.user_id
  WHERE ep.organization_id = _organization_id
    AND p.login_pin = extensions.crypt(_pin, p.login_pin)
    AND ep.is_active = true
    AND ep.is_approved = true
  LIMIT 1;

  -- If no match, still return a single row so the client gets attempts_remaining
  IF NOT v_match_found THEN
    RETURN QUERY SELECT
      NULL::uuid, NULL::text, NULL::text,
      NULL::boolean, NULL::boolean,
      NULL::timestamptz, v_remaining;
  END IF;
END;
$function$;

-- ─── 2. validate_dock_pin: add attempts_remaining ──────────────────
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
   lockout_until timestamptz,
   attempts_remaining int
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_device_attempts int := 0;
  v_org_attempts int;
  v_active_locations int;
  v_org_threshold int;
  v_device_oldest timestamptz;
  v_org_oldest timestamptz;
  v_lockout_until timestamptz := NULL;
  v_rate_org_id uuid := COALESCE(_organization_id, '00000000-0000-0000-0000-000000000000'::uuid);
  v_match_found boolean := false;
  v_remaining int := NULL;
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
      v_lockout_until, 0;
    RETURN;
  END IF;

  -- Match check before logging so successful logins don't pad the counter
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_pins p
    INNER JOIN public.employee_profiles ep ON ep.user_id = p.user_id
    WHERE p.login_pin = extensions.crypt(_pin, p.login_pin)
      AND ep.is_active = true
      AND ep.is_approved = true
      AND (_organization_id IS NULL OR ep.organization_id = _organization_id)
  ) INTO v_match_found;

  IF NOT v_match_found THEN
    INSERT INTO public.pin_attempt_log (target_org_id, device_fingerprint, ip_address, surface)
    VALUES (v_rate_org_id, _device_fingerprint, _ip_address, 'dock');
    v_remaining := GREATEST(0, 10 - v_device_attempts - 1);
  END IF;

  DELETE FROM public.pin_attempt_log WHERE attempted_at < now() - interval '1 hour';

  RETURN QUERY
  SELECT
    ep.user_id,
    COALESCE(ep.display_name, ep.full_name) as display_name,
    ep.photo_url,
    ep.location_id,
    ep.organization_id,
    COALESCE(ep.location_ids, ARRAY[]::text[]) as location_ids,
    NULL::timestamptz as lockout_until,
    v_remaining as attempts_remaining
  FROM public.employee_pins p
  INNER JOIN public.employee_profiles ep ON ep.user_id = p.user_id
  WHERE p.login_pin = extensions.crypt(_pin, p.login_pin)
    AND ep.is_active = true
    AND ep.is_approved = true
    AND (_organization_id IS NULL OR ep.organization_id = _organization_id)
  LIMIT 1;

  IF NOT v_match_found THEN
    RETURN QUERY SELECT
      NULL::uuid, NULL::text, NULL::text,
      NULL::text, NULL::uuid, NULL::text[],
      NULL::timestamptz, v_remaining;
  END IF;
END;
$function$;

-- ─── 3. pin_lockout_overrides audit table ──────────────────────────
CREATE TABLE IF NOT EXISTS public.pin_lockout_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cleared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  device_fingerprint TEXT NOT NULL,
  surface TEXT NOT NULL CHECK (surface IN ('login', 'dock')),
  attempts_cleared INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pin_lockout_overrides ENABLE ROW LEVEL SECURITY;

-- Owners and admins can view the audit log for transparency.
DROP POLICY IF EXISTS "Org admins can view lockout overrides" ON public.pin_lockout_overrides;
CREATE POLICY "Org admins can view lockout overrides"
  ON public.pin_lockout_overrides FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

-- No INSERT/UPDATE/DELETE policies → only the security-definer RPC can write.

CREATE INDEX IF NOT EXISTS idx_pin_lockout_overrides_org_time
  ON public.pin_lockout_overrides (organization_id, created_at DESC);

-- ─── 4. clear_device_pin_lockout RPC (primary owner only) ──────────
CREATE OR REPLACE FUNCTION public.clear_device_pin_lockout(
  _organization_id uuid,
  _device_fingerprint text,
  _surface text DEFAULT 'login'
)
 RETURNS TABLE(cleared_count int)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_is_primary_owner boolean := false;
  v_is_super_admin boolean := false;
  v_surface text := COALESCE(_surface, 'login');
  v_deleted int := 0;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF v_surface NOT IN ('login', 'dock') THEN
    RAISE EXCEPTION 'Invalid surface' USING ERRCODE = '22023';
  END IF;

  IF _device_fingerprint IS NULL OR length(_device_fingerprint) = 0 THEN
    RAISE EXCEPTION 'Device fingerprint required' USING ERRCODE = '22023';
  END IF;

  -- Hard gate: primary owner of THIS org, or platform super admin
  SELECT COALESCE(ep.is_primary_owner, false), COALESCE(ep.is_super_admin, false)
    INTO v_is_primary_owner, v_is_super_admin
  FROM public.employee_profiles ep
  WHERE ep.user_id = v_caller
    AND ep.organization_id = _organization_id
  LIMIT 1;

  IF NOT (v_is_primary_owner OR v_is_super_admin OR public.is_platform_user(v_caller)) THEN
    RAISE EXCEPTION 'Only the primary owner can clear device lockouts' USING ERRCODE = '42501';
  END IF;

  -- Clear the active 5-minute window for this device + surface
  WITH deleted AS (
    DELETE FROM public.pin_attempt_log
    WHERE target_org_id = _organization_id
      AND device_fingerprint = _device_fingerprint
      AND surface = v_surface
      AND attempted_at > now() - interval '5 minutes'
    RETURNING 1
  )
  SELECT count(*)::int INTO v_deleted FROM deleted;

  -- Audit
  INSERT INTO public.pin_lockout_overrides (
    organization_id, cleared_by_user_id, device_fingerprint, surface, attempts_cleared
  ) VALUES (
    _organization_id, v_caller, _device_fingerprint, v_surface, v_deleted
  );

  RETURN QUERY SELECT v_deleted;
END;
$function$;