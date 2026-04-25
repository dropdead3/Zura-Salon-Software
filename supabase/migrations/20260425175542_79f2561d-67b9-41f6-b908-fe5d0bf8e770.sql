
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-splash-cache',
  'org-splash-cache',
  true,
  3145728, -- 3 MB
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 3145728,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg'];

-- Public read
DROP POLICY IF EXISTS "Org splash cache is publicly readable" ON storage.objects;
CREATE POLICY "Org splash cache is publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'org-splash-cache');

-- Org admins can upload/replace their own org's splash
-- Path convention: {organization_id}.png  (or .jpg)
DROP POLICY IF EXISTS "Org admins can upload splash" ON storage.objects;
CREATE POLICY "Org admins can upload splash"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'org-splash-cache'
    AND public.is_org_admin(
      auth.uid(),
      (regexp_replace(name, '\.(png|jpg|jpeg)$', '', 'i'))::uuid
    )
  );

DROP POLICY IF EXISTS "Org admins can update splash" ON storage.objects;
CREATE POLICY "Org admins can update splash"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'org-splash-cache'
    AND public.is_org_admin(
      auth.uid(),
      (regexp_replace(name, '\.(png|jpg|jpeg)$', '', 'i'))::uuid
    )
  );

DROP POLICY IF EXISTS "Org admins can delete splash" ON storage.objects;
CREATE POLICY "Org admins can delete splash"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'org-splash-cache'
    AND public.is_org_admin(
      auth.uid(),
      (regexp_replace(name, '\.(png|jpg|jpeg)$', '', 'i'))::uuid
    )
  );
