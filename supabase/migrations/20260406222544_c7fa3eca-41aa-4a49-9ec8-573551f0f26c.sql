
-- ================================================================
-- Phase 8: Cross-Tenant RLS Fix + PIN Rate Limiting
-- ================================================================

-- ─── 1. Update can_view_all_clients to verify employee is active ──
CREATE OR REPLACE FUNCTION public.can_view_all_clients(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_profiles ep
    WHERE ep.user_id = _user_id
      AND ep.is_active = true
      AND (
        ep.is_super_admin = true
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role IN ('admin', 'manager', 'super_admin', 'receptionist')
        )
      )
  )
$$;

-- ─── 2. Fix clients RLS — scope by org ────────────────────────
DROP POLICY IF EXISTS "Admin roles can view all clients" ON public.clients;
CREATE POLICY "Org members can view clients"
  ON public.clients FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admin roles can manage clients" ON public.clients;
CREATE POLICY "Org admins can manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- ─── 3. Fix phorest_clients RLS — scope via location → org ───
DROP POLICY IF EXISTS "Users can view clients based on role" ON public.phorest_clients;
CREATE POLICY "Org members can view phorest clients"
  ON public.phorest_clients FOR SELECT TO authenticated
  USING (
    auth.uid() = preferred_stylist_id
    OR EXISTS (
      SELECT 1 FROM public.locations l
      INNER JOIN public.employee_profiles ep ON ep.organization_id = l.organization_id
      WHERE l.id = phorest_clients.location_id
        AND ep.user_id = auth.uid()
        AND ep.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage clients" ON public.phorest_clients;
CREATE POLICY "Org admins can manage phorest clients"
  ON public.phorest_clients FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = phorest_clients.location_id
        AND is_org_admin(auth.uid(), l.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = phorest_clients.location_id
        AND is_org_admin(auth.uid(), l.organization_id)
    )
  );

-- ─── 4. Fix appointments RLS — scope by org ──────────────────
DROP POLICY IF EXISTS "Admin roles can view all appointments" ON public.appointments;
CREATE POLICY "Org members can view appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admin roles can manage appointments" ON public.appointments;
CREATE POLICY "Org admins can manage appointments"
  ON public.appointments FOR ALL TO authenticated
  USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- ─── 5. Fix employee_profiles RLS — scope by org ─────────────
DROP POLICY IF EXISTS "Users can view their own profile" ON public.employee_profiles;
CREATE POLICY "Users can view org profiles"
  ON public.employee_profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR is_org_member(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "Coaches can insert profiles" ON public.employee_profiles;
CREATE POLICY "Org admins can insert profiles"
  ON public.employee_profiles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR is_org_admin(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.employee_profiles;
CREATE POLICY "Users can update own or org admin"
  ON public.employee_profiles FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR is_org_admin(auth.uid(), organization_id)
  )
  WITH CHECK (
    auth.uid() = user_id
    OR is_org_admin(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "Coaches can delete profiles" ON public.employee_profiles;
CREATE POLICY "Org admins can delete profiles"
  ON public.employee_profiles FOR DELETE TO authenticated
  USING (is_org_admin(auth.uid(), organization_id));

-- ─── 6. Fix client_cards_on_file SELECT — add org scoping ────
DROP POLICY IF EXISTS "Authorized staff can view cards" ON public.client_cards_on_file;
CREATE POLICY "Authorized org staff can view cards"
  ON public.client_cards_on_file FOR SELECT TO authenticated
  USING (
    is_org_admin(auth.uid(), organization_id)
    OR (
      is_org_member(auth.uid(), organization_id)
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('manager', 'receptionist')
      )
    )
  );

-- ─── 7. Add PIN brute-force protection ───────────────────────
CREATE TABLE IF NOT EXISTS public.pin_attempt_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_org_id uuid,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pin_attempt_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_user_pin(_organization_id uuid, _pin text)
 RETURNS TABLE(user_id uuid, display_name text, photo_url text, is_super_admin boolean, is_primary_owner boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recent_attempts int;
BEGIN
  SELECT count(*) INTO v_recent_attempts
  FROM public.pin_attempt_log
  WHERE target_org_id = _organization_id
    AND attempted_at > now() - interval '5 minutes';

  IF v_recent_attempts >= 10 THEN
    RAISE EXCEPTION 'Too many PIN attempts. Please wait before trying again.';
  END IF;

  INSERT INTO public.pin_attempt_log (target_org_id) VALUES (_organization_id);
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

CREATE OR REPLACE FUNCTION public.validate_dock_pin(_pin text, _organization_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, display_name text, photo_url text, location_id text, organization_id uuid, location_ids text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recent_attempts int;
  v_rate_org_id uuid := COALESCE(_organization_id, '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  SELECT count(*) INTO v_recent_attempts
  FROM public.pin_attempt_log
  WHERE target_org_id = v_rate_org_id
    AND attempted_at > now() - interval '5 minutes';

  IF v_recent_attempts >= 10 THEN
    RAISE EXCEPTION 'Too many PIN attempts. Please wait before trying again.';
  END IF;

  INSERT INTO public.pin_attempt_log (target_org_id) VALUES (v_rate_org_id);
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
