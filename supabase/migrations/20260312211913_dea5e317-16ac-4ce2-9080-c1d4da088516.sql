
-- Create client_transformation_photos table
CREATE TABLE IF NOT EXISTS public.client_transformation_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  before_url TEXT,
  after_url TEXT,
  service_name TEXT,
  stylist_user_id UUID,
  notes TEXT,
  portfolio_approved BOOLEAN NOT NULL DEFAULT false,
  portfolio_category TEXT,
  taken_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_transformation_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view transformations"
  ON public.client_transformation_photos FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Authenticated org members can insert transformations"
  ON public.client_transformation_photos FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update own transformations"
  ON public.client_transformation_photos FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete transformations"
  ON public.client_transformation_photos FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transformation_photos_org
  ON public.client_transformation_photos(organization_id);
CREATE INDEX IF NOT EXISTS idx_transformation_photos_client
  ON public.client_transformation_photos(client_id);
CREATE INDEX IF NOT EXISTS idx_transformation_photos_stylist
  ON public.client_transformation_photos(stylist_user_id);
CREATE INDEX IF NOT EXISTS idx_transformation_photos_portfolio
  ON public.client_transformation_photos(portfolio_approved) WHERE portfolio_approved = true;

-- Create storage bucket for transformation photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-transformations', 'client-transformations', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload transformation photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'client-transformations');

-- Storage RLS: public read
CREATE POLICY "Anyone can view transformation photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'client-transformations');

-- Storage RLS: authenticated can delete own uploads
CREATE POLICY "Authenticated users can delete transformation photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'client-transformations');
