-- brand-logos
DROP POLICY IF EXISTS "Brand logos are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can list brand logos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'brand-logos');

-- business-logos
DROP POLICY IF EXISTS "Anyone can view business logos" ON storage.objects;
CREATE POLICY "Authenticated users can list business logos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'business-logos');

-- email-assets
DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can list email assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'email-assets');

-- employee-photos
DROP POLICY IF EXISTS "Anyone can view employee photos" ON storage.objects;
CREATE POLICY "Authenticated users can list employee photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'employee-photos');

-- kiosk-assets
DROP POLICY IF EXISTS "Kiosk assets are publicly readable" ON storage.objects;
CREATE POLICY "Authenticated users can list kiosk assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'kiosk-assets');

-- product-images
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
CREATE POLICY "Authenticated users can list product images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images');

-- website-sections (find existing policy name first via fallback)
DROP POLICY IF EXISTS "Website sections are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view website sections" ON storage.objects;
DROP POLICY IF EXISTS "Public can view website sections" ON storage.objects;
CREATE POLICY "Authenticated users can list website section assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'website-sections');