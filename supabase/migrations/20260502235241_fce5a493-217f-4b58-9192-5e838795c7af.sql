-- Review response template library
CREATE TABLE public.review_response_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  body text NOT NULL,
  tone text NOT NULL DEFAULT 'warm',
  applies_to text NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  use_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_response_templates_applies_to_chk
    CHECK (applies_to IN ('all','positive','neutral','negative')),
  CONSTRAINT review_response_templates_tone_chk
    CHECK (tone IN ('warm','professional','apologetic','celebratory','concise'))
);

CREATE INDEX idx_review_response_templates_org
  ON public.review_response_templates(organization_id, is_active);

ALTER TABLE public.review_response_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view review templates"
  ON public.review_response_templates FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins manage review templates"
  ON public.review_response_templates FOR ALL
  TO authenticated
  USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER trg_review_response_templates_updated
  BEFORE UPDATE ON public.review_response_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stylist feedback coaching notes
CREATE TABLE public.stylist_feedback_coaching_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stylist_user_id uuid NOT NULL,
  feedback_response_id uuid REFERENCES public.client_feedback_responses(id) ON DELETE SET NULL,
  note_text text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stylist_coaching_notes_category_chk
    CHECK (category IN ('general','technical','consultation','tone','recovery','recognition'))
);

CREATE INDEX idx_stylist_coaching_notes_org_stylist
  ON public.stylist_feedback_coaching_notes(organization_id, stylist_user_id, created_at DESC);

ALTER TABLE public.stylist_feedback_coaching_notes ENABLE ROW LEVEL SECURITY;

-- Org admins (leadership) manage all
CREATE POLICY "Org admins manage stylist coaching notes"
  ON public.stylist_feedback_coaching_notes FOR ALL
  TO authenticated
  USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- The stylist themselves may read + acknowledge their own notes
CREATE POLICY "Stylist can view own coaching notes"
  ON public.stylist_feedback_coaching_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = stylist_user_id);

CREATE POLICY "Stylist can acknowledge own coaching notes"
  ON public.stylist_feedback_coaching_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = stylist_user_id)
  WITH CHECK (auth.uid() = stylist_user_id);

CREATE TRIGGER trg_stylist_coaching_notes_updated
  BEFORE UPDATE ON public.stylist_feedback_coaching_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();