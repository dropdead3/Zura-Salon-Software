-- ================================================================
-- Phase 7: PIN Hashing + Twilio Credential Lockdown
-- ================================================================

-- ─── 1. Hash existing plaintext PINs ──────────────────────────
UPDATE public.employee_pins
SET login_pin = extensions.crypt(login_pin, extensions.gen_salt('bf', 8))
WHERE login_pin IS NOT NULL
  AND login_pin !~ '^\$2[aby]?\$';

-- ─── 2. Update set_employee_pin to hash before storing ────────
CREATE OR REPLACE FUNCTION public.set_employee_pin(_target_user_id uuid, _pin text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_target_org UUID;
  v_is_admin BOOLEAN;
  v_target_is_primary BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id, is_primary_owner INTO v_target_org, v_target_is_primary
  FROM public.employee_profiles
  WHERE user_id = _target_user_id;

  IF v_target_org IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  IF v_caller != _target_user_id THEN
    v_is_admin := public.is_org_admin(v_caller, v_target_org);
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Only admins can set other users PINs';
    END IF;
    IF v_target_is_primary THEN
      RAISE EXCEPTION 'Cannot modify Primary Owner PIN';
    END IF;
  END IF;

  IF _pin IS NOT NULL AND _pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  IF _pin IS NULL THEN
    DELETE FROM public.employee_pins WHERE user_id = _target_user_id;
  ELSE
    INSERT INTO public.employee_pins (user_id, login_pin, organization_id, updated_at)
    VALUES (_target_user_id, extensions.crypt(_pin, extensions.gen_salt('bf', 8)), v_target_org, now())
    ON CONFLICT (user_id) DO UPDATE SET login_pin = extensions.crypt(_pin, extensions.gen_salt('bf', 8)), updated_at = now();
  END IF;
END;
$function$;

-- ─── 3. Update validate_user_pin to use hash comparison ───────
CREATE OR REPLACE FUNCTION public.validate_user_pin(_organization_id uuid, _pin text)
 RETURNS TABLE(user_id uuid, display_name text, photo_url text, is_super_admin boolean, is_primary_owner boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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

-- ─── 4. Update validate_dock_pin to use hash comparison ───────
CREATE OR REPLACE FUNCTION public.validate_dock_pin(_pin text, _organization_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, display_name text, photo_url text, location_id text, organization_id uuid, location_ids text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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

-- ─── 5. Lock down organization_secrets — remove SELECT policy ─
DROP POLICY IF EXISTS "Admins and platform users can view org secrets" ON public.organization_secrets;