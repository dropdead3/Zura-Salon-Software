
-- Part B: Org-scope gamification tables

-- 1. Add organization_id to leaderboard_weights (currently global, needs per-org)
ALTER TABLE public.leaderboard_weights ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Add organization_id to leaderboard_achievements (nullable for platform defaults)
ALTER TABLE public.leaderboard_achievements ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 3. Add organization_id to user_achievements
ALTER TABLE public.user_achievements ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 4. Fix team_challenges SELECT policy — scope to org members only
DROP POLICY IF EXISTS "Authenticated users can view active challenges" ON public.team_challenges;
CREATE POLICY "Org members can view active challenges"
  ON public.team_challenges FOR SELECT TO authenticated
  USING (
    status IN ('active', 'completed')
    AND is_org_member(auth.uid(), organization_id)
  );

-- 5. Fix challenge_participants SELECT — scope via team_challenges org
DROP POLICY IF EXISTS "Users can view challenge participants" ON public.challenge_participants;
CREATE POLICY "Org members can view challenge participants"
  ON public.challenge_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_challenges tc
      WHERE tc.id = challenge_id
        AND is_org_member(auth.uid(), tc.organization_id)
    )
  );

-- 6. Fix challenge_progress_snapshots SELECT — scope via challenge → org
DROP POLICY IF EXISTS "Users can view progress snapshots" ON public.challenge_progress_snapshots;
CREATE POLICY "Org members can view progress snapshots"
  ON public.challenge_progress_snapshots FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_challenges tc
      WHERE tc.id = challenge_id
        AND is_org_member(auth.uid(), tc.organization_id)
    )
  );

-- 7. Fix leaderboard_weights SELECT — scope to org members
DROP POLICY IF EXISTS "Authenticated users can view weights" ON public.leaderboard_weights;
CREATE POLICY "Org members can view weights"
  ON public.leaderboard_weights FOR SELECT TO authenticated
  USING (
    organization_id IS NULL OR is_org_member(auth.uid(), organization_id)
  );

-- 8. Fix leaderboard_achievements SELECT — scope to org or global
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.leaderboard_achievements;
CREATE POLICY "Org members can view achievements"
  ON public.leaderboard_achievements FOR SELECT TO authenticated
  USING (
    organization_id IS NULL OR is_org_member(auth.uid(), organization_id)
  );

-- 9. Fix user_achievements policies — add org-scoped SELECT
DROP POLICY IF EXISTS "Admins can grant achievements" ON public.user_achievements;
CREATE POLICY "Org admins can grant achievements"
  ON public.user_achievements FOR ALL TO authenticated
  USING (
    organization_id IS NULL OR is_org_admin(auth.uid(), organization_id)
  )
  WITH CHECK (
    organization_id IS NULL OR is_org_admin(auth.uid(), organization_id)
  );

CREATE POLICY "Org members can view achievements"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (
    organization_id IS NULL OR is_org_member(auth.uid(), organization_id)
  );
