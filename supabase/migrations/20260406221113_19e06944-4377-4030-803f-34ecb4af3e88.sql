-- ================================================================
-- Phase 6 Security Hardening
-- ================================================================

-- ─── 1. phorest_staff_services — scope via staff mapping ──────
DROP POLICY IF EXISTS "Authenticated users can view staff service qualifications" ON public.phorest_staff_services;

CREATE POLICY "Org members can view staff services"
  ON public.phorest_staff_services FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.phorest_staff_mapping psm
      INNER JOIN public.employee_profiles ep ON ep.user_id = psm.user_id
      WHERE psm.phorest_staff_id = phorest_staff_services.phorest_staff_id
        AND public.is_org_member(auth.uid(), ep.organization_id)
    )
  );

-- ─── 2. signature_presets — scope to own user ─────────────────
DROP POLICY IF EXISTS "Authenticated users can view signature presets" ON public.signature_presets;
DROP POLICY IF EXISTS "Authenticated users can create signature presets" ON public.signature_presets;

CREATE POLICY "Users can view own signature presets"
  ON public.signature_presets FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create own signature presets"
  ON public.signature_presets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- ─── 3. build_tasks — restrict to platform users ──────────────
DROP POLICY IF EXISTS "Authenticated users can view build tasks" ON public.build_tasks;

CREATE POLICY "Platform users can view build tasks"
  ON public.build_tasks FOR SELECT TO authenticated
  USING (public.is_platform_user(auth.uid()));

-- ─── 4. leaderboard_history — add org_id, backfill, restrict ──
ALTER TABLE public.leaderboard_history
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.leaderboard_history lh
SET organization_id = ep.organization_id
FROM public.employee_profiles ep
WHERE ep.user_id = lh.user_id
  AND lh.organization_id IS NULL;

DROP POLICY IF EXISTS "Authenticated users can view leaderboard history" ON public.leaderboard_history;

CREATE POLICY "Org members can view leaderboard history"
  ON public.leaderboard_history FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
  );

CREATE INDEX IF NOT EXISTS idx_leaderboard_history_org
  ON public.leaderboard_history(organization_id);

-- ─── 5. client-transformations storage — fix INSERT path ownership ──
DROP POLICY IF EXISTS "Authenticated users can upload transformation photos" ON storage.objects;

CREATE POLICY "Users can upload own transformation photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-transformations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );