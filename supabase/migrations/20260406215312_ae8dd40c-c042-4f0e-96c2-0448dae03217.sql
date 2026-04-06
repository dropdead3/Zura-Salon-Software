
-- ================================================================
-- Phase 3 Security Hardening
-- ================================================================

-- 1. Drop leftover public storage policies
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view feedback screenshots" ON storage.objects;

-- 2. Drop old permissive business_settings policy
DROP POLICY IF EXISTS "Authenticated users can view business settings" ON public.business_settings;

-- 3. Fix kiosk asset storage policies
DROP POLICY IF EXISTS "Org admins can upload kiosk assets" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update kiosk assets" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete kiosk assets" ON storage.objects;

CREATE POLICY "Kiosk managers can upload kiosk assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kiosk-assets' AND public.can_manage_kiosk_settings(auth.uid()));

CREATE POLICY "Kiosk managers can update kiosk assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kiosk-assets' AND public.can_manage_kiosk_settings(auth.uid()));

CREATE POLICY "Kiosk managers can delete kiosk assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kiosk-assets' AND public.can_manage_kiosk_settings(auth.uid()));

-- ================================================================
-- 4. Move login_pin to separate table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.employee_pins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  login_pin TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_pins ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies — access ONLY via SECURITY DEFINER RPCs

-- Migrate existing PINs
INSERT INTO public.employee_pins (user_id, login_pin, organization_id)
SELECT user_id, login_pin, organization_id
FROM public.employee_profiles
WHERE login_pin IS NOT NULL AND organization_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Create RPC for setting PINs (admin or self)
CREATE OR REPLACE FUNCTION public.set_employee_pin(
  _target_user_id UUID,
  _pin TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_org_id UUID;
  v_target_org UUID;
  v_is_admin BOOLEAN;
  v_target_is_primary BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get target's org
  SELECT organization_id, is_primary_owner INTO v_target_org, v_target_is_primary
  FROM public.employee_profiles
  WHERE user_id = _target_user_id;

  IF v_target_org IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  -- Check: caller is self OR admin of same org
  IF v_caller != _target_user_id THEN
    v_is_admin := public.is_org_admin(v_caller, v_target_org);
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Only admins can set other users PINs';
    END IF;
    -- Cannot modify primary owner's PIN unless you ARE the primary owner
    IF v_target_is_primary THEN
      RAISE EXCEPTION 'Cannot modify Primary Owner PIN';
    END IF;
  END IF;

  -- Validate PIN format
  IF _pin IS NOT NULL AND _pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  IF _pin IS NULL THEN
    DELETE FROM public.employee_pins WHERE user_id = _target_user_id;
  ELSE
    INSERT INTO public.employee_pins (user_id, login_pin, organization_id, updated_at)
    VALUES (_target_user_id, _pin, v_target_org, now())
    ON CONFLICT (user_id) DO UPDATE SET login_pin = _pin, updated_at = now();
  END IF;
END;
$$;

-- Create RPC for checking if a user has a PIN
CREATE OR REPLACE FUNCTION public.check_user_has_pin(_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employee_pins WHERE user_id = _user_id
  )
$$;

-- Create RPC for admin: get team pin statuses (returns has_pin, not the pin itself)
CREATE OR REPLACE FUNCTION public.get_team_pin_statuses(_organization_id UUID)
RETURNS TABLE (
  user_id UUID,
  has_pin BOOLEAN
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ep.user_id, EXISTS (
    SELECT 1 FROM public.employee_pins p WHERE p.user_id = ep.user_id
  ) AS has_pin
  FROM public.employee_profiles ep
  WHERE ep.organization_id = _organization_id
    AND ep.is_active = true
    AND ep.is_approved = true
$$;

-- Update validate_dock_pin to read from employee_pins
CREATE OR REPLACE FUNCTION public.validate_dock_pin(_pin text, _organization_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(user_id uuid, display_name text, photo_url text, location_id text, organization_id uuid, location_ids text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ep.user_id,
    COALESCE(ep.display_name, ep.full_name) as display_name,
    ep.photo_url,
    ep.location_id,
    ep.organization_id,
    COALESCE(ep.location_ids, ARRAY[]::text[]) as location_ids
  FROM public.employee_pins p
  INNER JOIN public.employee_profiles ep ON ep.user_id = p.user_id
  WHERE p.login_pin = _pin
    AND ep.is_active = true
    AND ep.is_approved = true
    AND (_organization_id IS NULL OR ep.organization_id = _organization_id)
  LIMIT 1
$$;

-- Update validate_user_pin to read from employee_pins
CREATE OR REPLACE FUNCTION public.validate_user_pin(_organization_id uuid, _pin text)
RETURNS TABLE(user_id uuid, display_name text, photo_url text, is_super_admin boolean, is_primary_owner boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ep.user_id,
    COALESCE(ep.display_name, ep.full_name) as display_name,
    ep.photo_url,
    ep.is_super_admin,
    ep.is_primary_owner
  FROM public.employee_pins p
  INNER JOIN public.employee_profiles ep ON ep.user_id = p.user_id
  WHERE ep.organization_id = _organization_id
    AND p.login_pin = _pin
    AND ep.is_active = true
    AND ep.is_approved = true
  LIMIT 1
$$;

-- Drop login_pin from employee_profiles
ALTER TABLE public.employee_profiles DROP COLUMN IF EXISTS login_pin;

-- ================================================================
-- 5. Move Twilio credentials to organization_secrets
-- ================================================================

CREATE TABLE IF NOT EXISTS public.organization_secrets (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and platform users can view org secrets"
  ON public.organization_secrets FOR SELECT TO authenticated
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

CREATE POLICY "Admins can update org secrets"
  ON public.organization_secrets FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can insert org secrets"
  ON public.organization_secrets FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Migrate existing Twilio data
INSERT INTO public.organization_secrets (organization_id, twilio_account_sid, twilio_auth_token, twilio_phone_number)
SELECT id, twilio_account_sid, twilio_auth_token, twilio_phone_number
FROM public.organizations
WHERE twilio_account_sid IS NOT NULL OR twilio_auth_token IS NOT NULL OR twilio_phone_number IS NOT NULL
ON CONFLICT (organization_id) DO NOTHING;

-- Drop Twilio columns from organizations
ALTER TABLE public.organizations DROP COLUMN IF EXISTS twilio_account_sid;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS twilio_auth_token;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS twilio_phone_number;

-- Index for employee_pins org lookup
CREATE INDEX IF NOT EXISTS idx_employee_pins_org ON public.employee_pins(organization_id);
