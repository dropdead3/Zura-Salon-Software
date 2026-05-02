-- ============================================================================
-- Website Review Publishing Integration
-- Bridges client_feedback_responses (Reputation Engine source) into
-- website_testimonials (Website Editor display), with consent + display
-- preferences + edit-for-display copy preserved separately from originals.
-- ============================================================================

-- 1. Extend client_feedback_responses with consent + display lifecycle
ALTER TABLE public.client_feedback_responses
  ADD COLUMN IF NOT EXISTS display_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS display_name_preference text,
  ADD COLUMN IF NOT EXISTS display_status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS display_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS display_status_by uuid;

-- Validation trigger (per project canon: triggers, not CHECK constraints)
CREATE OR REPLACE FUNCTION public.validate_feedback_display_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_status IS NOT NULL AND NEW.display_status NOT IN (
    'new','eligible','approved','featured','hidden','unpublished','needs_consent','archived'
  ) THEN
    RAISE EXCEPTION 'invalid display_status: %', NEW.display_status;
  END IF;

  IF NEW.display_name_preference IS NOT NULL AND NEW.display_name_preference NOT IN (
    'first_only','first_initial','anonymous'
  ) THEN
    RAISE EXCEPTION 'invalid display_name_preference: %', NEW.display_name_preference;
  END IF;

  -- Track status transitions
  IF TG_OP = 'UPDATE' AND NEW.display_status IS DISTINCT FROM OLD.display_status THEN
    NEW.display_status_at := now();
  END IF;

  -- Track consent timestamp
  IF NEW.display_consent IS TRUE AND (TG_OP = 'INSERT' OR OLD.display_consent IS DISTINCT FROM NEW.display_consent) THEN
    NEW.display_consent_at := COALESCE(NEW.display_consent_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_feedback_display_status ON public.client_feedback_responses;
CREATE TRIGGER trg_validate_feedback_display_status
  BEFORE INSERT OR UPDATE ON public.client_feedback_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_feedback_display_status();

CREATE INDEX IF NOT EXISTS idx_feedback_responses_display_status
  ON public.client_feedback_responses (organization_id, display_status);

-- 2. Extend website_testimonials with curation linkage + display controls
ALTER TABLE public.website_testimonials
  ADD COLUMN IF NOT EXISTS source_response_id uuid REFERENCES public.client_feedback_responses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS display_edited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_body text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_scopes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_id uuid,
  ADD COLUMN IF NOT EXISTS stylist_user_id uuid,
  ADD COLUMN IF NOT EXISTS location_id uuid,
  ADD COLUMN IF NOT EXISTS show_stylist boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_service boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_date boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_rating boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_name_override text;

-- One website row per source review (curate-once invariant)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_website_testimonials_source
  ON public.website_testimonials (source_response_id)
  WHERE source_response_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_website_testimonials_org_featured
  ON public.website_testimonials (organization_id, is_featured)
  WHERE is_featured = true;

-- Validate feature_scopes values
CREATE OR REPLACE FUNCTION public.validate_website_testimonial_scopes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope text;
BEGIN
  IF NEW.feature_scopes IS NOT NULL THEN
    FOREACH v_scope IN ARRAY NEW.feature_scopes LOOP
      IF v_scope NOT IN ('homepage','service_pages','stylist_pages') THEN
        RAISE EXCEPTION 'invalid feature_scope: %', v_scope;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_website_testimonial_scopes ON public.website_testimonials;
CREATE TRIGGER trg_validate_website_testimonial_scopes
  BEFORE INSERT OR UPDATE ON public.website_testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_website_testimonial_scopes();

-- 3. Eligibility view (security_invoker so existing RLS applies)
CREATE OR REPLACE VIEW public.eligible_website_reviews
WITH (security_invoker = true)
AS
SELECT
  r.id                          AS response_id,
  r.organization_id,
  r.client_id,
  r.staff_user_id,
  r.appointment_id,
  r.overall_rating,
  r.comments,
  r.responded_at,
  r.created_at,
  r.display_consent,
  r.display_name_preference,
  r.display_status,
  c.first_name                  AS client_first_name,
  c.last_name                   AS client_last_name,
  wt.id                         AS website_testimonial_id,
  wt.enabled                    AS published,
  wt.is_featured,
  wt.feature_scopes,
  wt.service_id,
  wt.stylist_user_id,
  wt.location_id
FROM public.client_feedback_responses r
LEFT JOIN public.phorest_clients c ON c.id = r.client_id
LEFT JOIN public.website_testimonials wt ON wt.source_response_id = r.id
WHERE r.overall_rating = 5
  AND r.comments IS NOT NULL
  AND length(trim(r.comments)) > 0
  AND r.appointment_id IS NOT NULL
  AND COALESCE(r.display_status, 'new') NOT IN ('archived');

-- 4. Consent / curation audit log (operator override traceability)
CREATE TABLE IF NOT EXISTS public.website_review_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  response_id     uuid REFERENCES public.client_feedback_responses(id) ON DELETE SET NULL,
  testimonial_id  uuid REFERENCES public.website_testimonials(id) ON DELETE SET NULL,
  action          text NOT NULL,
  consent_override boolean NOT NULL DEFAULT false,
  override_attestation text,
  performed_by    uuid,
  performed_at    timestamptz NOT NULL DEFAULT now(),
  metadata        jsonb
);

CREATE INDEX IF NOT EXISTS idx_review_audit_org ON public.website_review_audit_log (organization_id, performed_at DESC);

ALTER TABLE public.website_review_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view review audit"
  ON public.website_review_audit_log FOR SELECT
  TO authenticated
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can write review audit"
  ON public.website_review_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (is_org_admin(auth.uid(), organization_id));
