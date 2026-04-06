-- Remove old permissive meeting-notes policies
DROP POLICY IF EXISTS "Authenticated users can view meeting note photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload meeting note photos" ON storage.objects;

-- Replace with scoped INSERT
CREATE POLICY "Users can upload own meeting note photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'meeting-notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Remove old permissive chat-attachments INSERT
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;