-- Drop the overly permissive SELECT policy on meeting-notes
DROP POLICY IF EXISTS "Authenticated users can view meeting notes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view meeting notes" ON storage.objects;

-- Create scoped SELECT policy: users can only view files in their own folder
CREATE POLICY "Users can view own meeting notes"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'meeting-notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );