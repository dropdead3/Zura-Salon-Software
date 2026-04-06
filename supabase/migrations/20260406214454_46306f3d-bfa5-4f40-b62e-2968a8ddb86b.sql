
-- 1. Business settings — restrict. Table has no org_id, so restrict to admins only
-- The previous "Authenticated users can view business settings" was already dropped by previous failed migration
-- Just re-create with tighter scope
CREATE POLICY "Admins and platform users can view business settings"
  ON public.business_settings FOR SELECT TO authenticated
  USING (
    public.is_platform_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.employee_profiles ep
      WHERE ep.user_id = auth.uid()
        AND (ep.is_super_admin = true OR ep.is_primary_owner = true)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'manager', 'super_admin')
    )
  );

-- 2. Kiosk devices — remove anonymous INSERT
DROP POLICY IF EXISTS "Kiosk can self-register with org scope" ON public.kiosk_devices;

-- 3. Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN (
  'client-transformations', 'chat-attachments', 'meeting-notes',
  'proof-uploads', 'platform-feedback'
);
