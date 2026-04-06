
-- 1. Add organization_id to graduation_requirements
ALTER TABLE public.graduation_requirements
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS applies_to_level_ids UUID[] DEFAULT NULL;

-- Backfill organization_id from the first org (existing data)
UPDATE public.graduation_requirements
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.graduation_requirements
  ALTER COLUMN organization_id SET NOT NULL;

-- 2. Add organization_id to graduation_submissions
ALTER TABLE public.graduation_submissions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.graduation_submissions
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

ALTER TABLE public.graduation_submissions
  ALTER COLUMN organization_id SET NOT NULL;

-- 3. Add organization_id to graduation_feedback
ALTER TABLE public.graduation_feedback
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.graduation_feedback
SET organization_id = (
  SELECT gs.organization_id FROM public.graduation_submissions gs
  WHERE gs.id = graduation_feedback.submission_id
  LIMIT 1
)
WHERE organization_id IS NULL;

-- For any orphans, use first org
UPDATE public.graduation_feedback
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

ALTER TABLE public.graduation_feedback
  ALTER COLUMN organization_id SET NOT NULL;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_graduation_requirements_org ON public.graduation_requirements(organization_id);
CREATE INDEX IF NOT EXISTS idx_graduation_submissions_org ON public.graduation_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_graduation_feedback_org ON public.graduation_feedback(organization_id);

-- 5. Drop old RLS policies
DROP POLICY IF EXISTS "Anyone authenticated can view active requirements" ON public.graduation_requirements;
DROP POLICY IF EXISTS "Admins can manage requirements" ON public.graduation_requirements;

DROP POLICY IF EXISTS "Users can view their own submissions" ON public.graduation_submissions;
DROP POLICY IF EXISTS "Admins/managers can view all submissions" ON public.graduation_submissions;
DROP POLICY IF EXISTS "Users can create their own submissions" ON public.graduation_submissions;
DROP POLICY IF EXISTS "Users can update their own pending submissions" ON public.graduation_submissions;
DROP POLICY IF EXISTS "Admins/managers can update any submission" ON public.graduation_submissions;

DROP POLICY IF EXISTS "Admins/managers can view all feedback" ON public.graduation_feedback;
DROP POLICY IF EXISTS "Users can view feedback on their submissions" ON public.graduation_feedback;
DROP POLICY IF EXISTS "Admins/managers can create feedback" ON public.graduation_feedback;

-- 6. New org-scoped RLS policies

-- graduation_requirements
CREATE POLICY "Org members can view active requirements"
  ON public.graduation_requirements FOR SELECT
  USING (is_active = true AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage requirements"
  ON public.graduation_requirements FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- graduation_submissions
CREATE POLICY "Org members can view own submissions"
  ON public.graduation_submissions FOR SELECT
  USING (auth.uid() = assistant_id AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can view all submissions"
  ON public.graduation_submissions FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can create own submissions"
  ON public.graduation_submissions FOR INSERT
  WITH CHECK (auth.uid() = assistant_id AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update own pending submissions"
  ON public.graduation_submissions FOR UPDATE
  USING (auth.uid() = assistant_id AND status IN ('pending', 'needs_revision') AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can update any submission"
  ON public.graduation_submissions FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- graduation_feedback
CREATE POLICY "Org admins can view all feedback"
  ON public.graduation_feedback FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can view feedback on own submissions"
  ON public.graduation_feedback FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.graduation_submissions gs
    WHERE gs.id = graduation_feedback.submission_id
    AND gs.assistant_id = auth.uid()
  ) AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create feedback"
  ON public.graduation_feedback FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
