
-- Create storage bucket for SEO proof artifacts
INSERT INTO storage.buckets (id, name, public)
VALUES ('seo-proof-artifacts', 'seo-proof-artifacts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Org members can upload proof artifacts to their org folder
CREATE POLICY "org_members_upload_seo_proof"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'seo-proof-artifacts'
  AND (storage.foldername(name))[1] IN (
    SELECT o.id::text FROM public.organizations o
    WHERE public.is_org_member(auth.uid(), o.id)
  )
);

-- RLS: Org members can view proof artifacts from their org
CREATE POLICY "org_members_read_seo_proof"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'seo-proof-artifacts'
  AND (storage.foldername(name))[1] IN (
    SELECT o.id::text FROM public.organizations o
    WHERE public.is_org_member(auth.uid(), o.id)
  )
);
