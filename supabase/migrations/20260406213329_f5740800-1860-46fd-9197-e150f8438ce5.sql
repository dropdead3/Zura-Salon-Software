
-- Fix kiosk config function (already created with correct columns in previous attempt)
-- Previous attempt succeeded for this function, so skip

-- ================================================================
-- Drop dangerous policies (idempotent)
-- ================================================================

DROP POLICY IF EXISTS "Public can view active organizations by slug" ON public.organizations;
DROP POLICY IF EXISTS "Public can view homepage-visible stylists" ON public.employee_profiles;
DROP POLICY IF EXISTS "Anyone can validate portal token" ON public.client_portal_tokens;
DROP POLICY IF EXISTS "Anyone can view feedback by token" ON public.client_feedback_responses;
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.platform_invitations;
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.staff_invitations;
DROP POLICY IF EXISTS "Public can view own bookings by email" ON public.day_rate_bookings;
DROP POLICY IF EXISTS "Kiosk can read settings by location" ON public.organization_kiosk_settings;
DROP POLICY IF EXISTS "Anyone can view business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Kiosk can read own device by token" ON public.kiosk_devices;
DROP POLICY IF EXISTS "Kiosk can update own device by token" ON public.kiosk_devices;

-- ================================================================
-- Replacement policies
-- ================================================================

-- Business settings: only authenticated users
CREATE POLICY "Authenticated users can view business settings"
  ON public.business_settings FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ================================================================
-- Fix cross-org data leaks
-- ================================================================

-- Client notes: scope via note author's org membership
-- A user can see non-private notes written by users in the same org
DROP POLICY IF EXISTS "Users can view team notes" ON public.client_notes;
CREATE POLICY "Users can view team notes in their org"
  ON public.client_notes FOR SELECT
  TO authenticated
  USING (
    is_private = false
    AND EXISTS (
      SELECT 1 FROM public.employee_profiles ep
      WHERE ep.user_id = client_notes.user_id
        AND public.is_org_member(auth.uid(), ep.organization_id)
    )
  );

-- Client form signatures: scope via appointment org
DROP POLICY IF EXISTS "Authenticated users can read signatures" ON public.client_form_signatures;
CREATE POLICY "Org members can view signatures"
  ON public.client_form_signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = client_form_signatures.appointment_id
        AND public.is_org_member(auth.uid(), a.organization_id)
    )
  );

-- ================================================================
-- Signature presets ownership
-- ================================================================

DROP POLICY IF EXISTS "Authenticated users can update signature presets" ON public.signature_presets;
DROP POLICY IF EXISTS "Authenticated users can delete signature presets" ON public.signature_presets;

CREATE POLICY "Users can update their own signature presets"
  ON public.signature_presets FOR UPDATE TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own signature presets"
  ON public.signature_presets FOR DELETE TO authenticated
  USING (auth.uid() = created_by);
