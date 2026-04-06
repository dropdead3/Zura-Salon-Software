
-- ================================================================
-- 1. Locations — hide stripe_account_id from public
-- ================================================================

DROP POLICY IF EXISTS "Anyone can view active locations" ON public.locations;

CREATE OR REPLACE FUNCTION public.get_public_locations(p_organization_id uuid DEFAULT NULL)
RETURNS TABLE (
  id text, name text, address text, city text, state_province text, country text,
  phone text, booking_url text, google_maps_url text,
  hours text, hours_json jsonb,
  is_active boolean, display_order integer, major_crossroads text,
  show_on_website boolean, organization_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.id, l.name, l.address, l.city, l.state_province, l.country,
         l.phone, l.booking_url, l.google_maps_url, l.hours, l.hours_json,
         l.is_active, l.display_order, l.major_crossroads, l.show_on_website,
         l.organization_id
  FROM public.locations l
  WHERE l.is_active = true
    AND (p_organization_id IS NULL OR l.organization_id = p_organization_id)
$$;

-- Authenticated org members get full access
CREATE POLICY "Org members can view locations"
  ON public.locations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_user(auth.uid()));

-- ================================================================
-- 2. Client-transformations storage — restrict to owner
-- ================================================================

DROP POLICY IF EXISTS "Anyone can view transformation photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete transformation photos" ON storage.objects;

CREATE POLICY "Authenticated users can view own transformation photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-transformations' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own transformation photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-transformations' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ================================================================
-- 3. Proof-uploads storage — scope SELECT to owner
-- ================================================================

DROP POLICY IF EXISTS "Users can view proof" ON storage.objects;

CREATE POLICY "Users can view own proof uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'proof-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
