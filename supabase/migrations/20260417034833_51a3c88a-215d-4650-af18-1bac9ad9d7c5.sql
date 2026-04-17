
-- ============================================================================
-- Inquiry Inspiration Photos + Auto-Match Identity Bridge
-- ============================================================================

-- 1. Add match audit columns to salon_inquiries
ALTER TABLE public.salon_inquiries
  ADD COLUMN IF NOT EXISTS match_method TEXT
    CHECK (match_method IN ('auto_email', 'auto_phone', 'auto_both', 'manual', 'unmatched')),
  ADD COLUMN IF NOT EXISTS match_confidence TEXT
    CHECK (match_confidence IN ('high', 'medium', 'ambiguous', 'none'));

-- 2. Create inquiry_inspiration_photos table
CREATE TABLE IF NOT EXISTS public.inquiry_inspiration_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES public.salon_inquiries(id) ON DELETE CASCADE,
  client_id TEXT, -- backfilled when inquiry resolves to a phorest client
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_inspiration_photos_inquiry
  ON public.inquiry_inspiration_photos(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_inspiration_photos_client
  ON public.inquiry_inspiration_photos(client_id);

ALTER TABLE public.inquiry_inspiration_photos ENABLE ROW LEVEL SECURITY;

-- Anon can insert photos tied to a recently-created inquiry (within 1 hour, source = website_form)
CREATE POLICY "Anon can attach photos to website inquiries"
  ON public.inquiry_inspiration_photos FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salon_inquiries si
      WHERE si.id = inquiry_id
        AND si.source = 'website_form'
        AND si.created_at > now() - interval '1 hour'
    )
  );

CREATE POLICY "Authenticated can attach photos to inquiries"
  ON public.inquiry_inspiration_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salon_inquiries si
      WHERE si.id = inquiry_id
        AND (si.source = 'website_form' OR public.is_coach_or_admin(auth.uid()))
    )
  );

CREATE POLICY "Management can view all inspiration photos"
  ON public.inquiry_inspiration_photos FOR SELECT
  TO authenticated
  USING (public.is_coach_or_admin(auth.uid()));

CREATE POLICY "Management can update inspiration photos"
  ON public.inquiry_inspiration_photos FOR UPDATE
  TO authenticated
  USING (public.is_coach_or_admin(auth.uid()));

CREATE POLICY "Management can delete inspiration photos"
  ON public.inquiry_inspiration_photos FOR DELETE
  TO authenticated
  USING (public.is_coach_or_admin(auth.uid()));

-- 3. Create the auto-match resolver function
CREATE OR REPLACE FUNCTION public.resolve_inquiry_identity(p_inquiry_id UUID)
RETURNS TABLE(
  matched_phorest_client_id TEXT,
  match_method TEXT,
  match_confidence TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_phone TEXT;
  v_email_norm TEXT;
  v_phone_norm TEXT;
  v_email_match TEXT;
  v_phone_match TEXT;
  v_email_match_count INT := 0;
  v_phone_match_count INT := 0;
  v_method TEXT := 'unmatched';
  v_confidence TEXT := 'none';
  v_resolved_id TEXT := NULL;
BEGIN
  -- Load inquiry email + phone
  SELECT email, phone INTO v_email, v_phone
  FROM public.salon_inquiries
  WHERE id = p_inquiry_id;

  IF v_email IS NULL AND v_phone IS NULL THEN
    matched_phorest_client_id := NULL;
    match_method := 'unmatched';
    match_confidence := 'none';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Normalize email
  IF v_email IS NOT NULL AND v_email != '' THEN
    v_email_norm := lower(trim(v_email));
  END IF;

  -- Normalize phone (E.164 / digits-only with +1 for US 10-digit)
  IF v_phone IS NOT NULL AND v_phone != '' THEN
    v_phone_norm := regexp_replace(v_phone, '[^0-9+]', '', 'g');
    IF length(v_phone_norm) = 10 AND left(v_phone_norm, 1) != '+' THEN
      v_phone_norm := '+1' || v_phone_norm;
    ELSIF length(v_phone_norm) = 11 AND left(v_phone_norm, 1) = '1' THEN
      v_phone_norm := '+' || v_phone_norm;
    END IF;
  END IF;

  -- Email match lookup
  IF v_email_norm IS NOT NULL THEN
    SELECT phorest_client_id, COUNT(*) OVER ()
      INTO v_email_match, v_email_match_count
    FROM public.phorest_clients
    WHERE email_normalized = v_email_norm
      AND COALESCE(is_archived, false) = false
    LIMIT 1;
  END IF;

  -- Phone match lookup
  IF v_phone_norm IS NOT NULL THEN
    SELECT phorest_client_id, COUNT(*) OVER ()
      INTO v_phone_match, v_phone_match_count
    FROM public.phorest_clients
    WHERE phone_normalized = v_phone_norm
      AND COALESCE(is_archived, false) = false
    LIMIT 1;
  END IF;

  -- Resolve match priority
  IF v_email_match IS NOT NULL AND v_phone_match IS NOT NULL THEN
    IF v_email_match = v_phone_match THEN
      v_resolved_id := v_email_match;
      v_method := 'auto_both';
      v_confidence := 'high';
    ELSE
      -- Email and phone match different clients → ambiguous, no auto-link
      v_resolved_id := NULL;
      v_method := 'unmatched';
      v_confidence := 'ambiguous';
    END IF;
  ELSIF v_email_match IS NOT NULL THEN
    v_resolved_id := v_email_match;
    v_method := 'auto_email';
    v_confidence := CASE WHEN v_email_match_count = 1 THEN 'high' ELSE 'medium' END;
  ELSIF v_phone_match IS NOT NULL THEN
    v_resolved_id := v_phone_match;
    v_method := 'auto_phone';
    v_confidence := CASE WHEN v_phone_match_count = 1 THEN 'high' ELSE 'medium' END;
  END IF;

  -- Persist results onto the inquiry
  UPDATE public.salon_inquiries
  SET phorest_client_id = v_resolved_id,
      match_method = v_method,
      match_confidence = v_confidence,
      updated_at = now()
  WHERE id = p_inquiry_id;

  -- Backfill any inspiration photos already attached to this inquiry
  IF v_resolved_id IS NOT NULL THEN
    UPDATE public.inquiry_inspiration_photos
    SET client_id = v_resolved_id
    WHERE inquiry_id = p_inquiry_id;
  END IF;

  matched_phorest_client_id := v_resolved_id;
  match_method := v_method;
  match_confidence := v_confidence;
  RETURN NEXT;
END;
$$;

-- Grant execute to anon + authenticated so the trigger can call it
GRANT EXECUTE ON FUNCTION public.resolve_inquiry_identity(UUID) TO anon, authenticated;

-- 4. Trigger: auto-resolve identity on inquiry insert
CREATE OR REPLACE FUNCTION public.trigger_resolve_inquiry_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only resolve if email or phone provided
  IF NEW.email IS NOT NULL OR NEW.phone IS NOT NULL THEN
    PERFORM public.resolve_inquiry_identity(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_resolve_inquiry_identity ON public.salon_inquiries;
CREATE TRIGGER auto_resolve_inquiry_identity
  AFTER INSERT ON public.salon_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_resolve_inquiry_identity();

-- 5. Storage bucket for inspiration photos (private; signed URLs only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inquiry-inspiration',
  'inquiry-inspiration',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

-- Storage RLS: anon can upload to inquiry-inspiration bucket (paths are scoped per-inquiry)
CREATE POLICY "Anon can upload inspiration photos"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'inquiry-inspiration');

CREATE POLICY "Authenticated can upload inspiration photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inquiry-inspiration');

CREATE POLICY "Management can read inspiration photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'inquiry-inspiration'
    AND public.is_coach_or_admin(auth.uid())
  );

CREATE POLICY "Management can delete inspiration photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'inquiry-inspiration'
    AND public.is_coach_or_admin(auth.uid())
  );
