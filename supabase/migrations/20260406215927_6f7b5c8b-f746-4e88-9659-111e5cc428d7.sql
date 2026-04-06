
-- ================================================================
-- Phase 4 Security Hardening
-- ================================================================

-- 1. Products — hide cost columns from public access
DROP POLICY IF EXISTS "Public can view online products" ON public.products;

CREATE OR REPLACE VIEW public.products_public AS
SELECT
  id, organization_id, location_id, name, description, brand, category, subcategory,
  sku, barcode, retail_price, size, container_size, image_url,
  is_active, available_online, product_type,
  variant, swatch_color, color_type, created_at
FROM public.products
WHERE is_active = true AND available_online = true;

GRANT SELECT ON public.products_public TO anon, authenticated;

-- 2. Client form signatures — restrict INSERT to org members
DROP POLICY IF EXISTS "Authenticated users can insert signatures" ON public.client_form_signatures;

CREATE POLICY "Org members can insert signatures"
  ON public.client_form_signatures FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id
        AND public.is_org_member(auth.uid(), a.organization_id)
    )
  );

-- 3. Kiosk analytics — restrict to authenticated org members
DROP POLICY IF EXISTS "Kiosk can insert analytics with org scope" ON public.kiosk_analytics;

CREATE POLICY "Authenticated org members can insert kiosk analytics"
  ON public.kiosk_analytics FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL
    AND public.is_org_member(auth.uid(), organization_id)
  );

-- 4. Chat user status — scope SELECT to same org
DROP POLICY IF EXISTS "Authenticated users can view status" ON public.chat_user_status;

CREATE POLICY "Org members can view chat status"
  ON public.chat_user_status FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_profiles ep1
      INNER JOIN public.employee_profiles ep2 ON ep1.organization_id = ep2.organization_id
      WHERE ep1.user_id = auth.uid()
        AND ep2.user_id = chat_user_status.user_id
        AND ep1.is_active = true
    )
  );

-- 5. Booking addon events — restrict INSERT to org members
DROP POLICY IF EXISTS "Authenticated users can insert addon events" ON public.booking_addon_events;

CREATE POLICY "Org members can insert addon events"
  ON public.booking_addon_events FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
  );
