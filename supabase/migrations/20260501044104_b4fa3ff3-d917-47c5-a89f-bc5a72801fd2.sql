CREATE POLICY "Public can view website section assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'website-sections');