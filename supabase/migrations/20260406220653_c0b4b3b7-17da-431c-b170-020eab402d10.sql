-- ================================================================
-- Phase 5 Security Hardening
-- ================================================================

-- ─── 1. Restrict client_cards_on_file SELECT ──────────────────
DROP POLICY IF EXISTS "Org members can view cards" ON public.client_cards_on_file;

CREATE POLICY "Authorized staff can view cards"
  ON public.client_cards_on_file FOR SELECT TO authenticated
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('manager', 'receptionist')
    )
  );

-- ─── 2. ring_the_bell_entries — add org_id, backfill, restrict ─
ALTER TABLE public.ring_the_bell_entries
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.ring_the_bell_entries rbe
SET organization_id = ep.organization_id
FROM public.employee_profiles ep
WHERE ep.user_id = rbe.user_id
  AND rbe.organization_id IS NULL;

DROP POLICY IF EXISTS "All staff can view all entries" ON public.ring_the_bell_entries;
DROP POLICY IF EXISTS "Everyone can view ring the bell" ON public.ring_the_bell_entries;

CREATE POLICY "Org members can view entries"
  ON public.ring_the_bell_entries FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
  );

CREATE INDEX IF NOT EXISTS idx_ring_the_bell_entries_org
  ON public.ring_the_bell_entries(organization_id);

-- ─── 3. shift_swaps — add org_id, backfill, restrict ──────────
ALTER TABLE public.shift_swaps
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.shift_swaps ss
SET organization_id = l.organization_id
FROM public.locations l
WHERE l.id = ss.location_id
  AND ss.organization_id IS NULL;

-- Fallback: backfill from requester's profile
UPDATE public.shift_swaps ss
SET organization_id = ep.organization_id
FROM public.employee_profiles ep
WHERE ep.user_id = ss.requester_id
  AND ss.organization_id IS NULL;

DROP POLICY IF EXISTS "Users can view all swaps" ON public.shift_swaps;

CREATE POLICY "Org members can view swaps"
  ON public.shift_swaps FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
  );

CREATE INDEX IF NOT EXISTS idx_shift_swaps_org
  ON public.shift_swaps(organization_id);

-- ─── 4. shift_swap_messages — add org_id, backfill, restrict ──
ALTER TABLE public.shift_swap_messages
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.shift_swap_messages ssm
SET organization_id = ss.organization_id
FROM public.shift_swaps ss
WHERE ss.id = ssm.swap_id
  AND ssm.organization_id IS NULL;

DROP POLICY IF EXISTS "Users can view swap messages" ON public.shift_swap_messages;

CREATE POLICY "Org members can view swap messages"
  ON public.shift_swap_messages FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
  );

CREATE INDEX IF NOT EXISTS idx_shift_swap_messages_org
  ON public.shift_swap_messages(organization_id);

-- ─── 5. staffing_history — add org_id, backfill, restrict ─────
ALTER TABLE public.staffing_history
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.staffing_history sh
SET organization_id = l.organization_id
FROM public.locations l
WHERE l.id = sh.location_id
  AND sh.organization_id IS NULL;

DROP POLICY IF EXISTS "Authenticated users can read staffing history" ON public.staffing_history;

CREATE POLICY "Org members can view staffing history"
  ON public.staffing_history FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
  );

CREATE INDEX IF NOT EXISTS idx_staffing_history_org
  ON public.staffing_history(organization_id);

-- ─── 6. marketing_campaigns — add org_id, backfill, restrict ──
ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.marketing_campaigns mc
SET organization_id = ep.organization_id
FROM public.employee_profiles ep
WHERE ep.user_id = mc.created_by
  AND mc.organization_id IS NULL;

DROP POLICY IF EXISTS "Authenticated can view campaigns" ON public.marketing_campaigns;

CREATE POLICY "Org members can view campaigns"
  ON public.marketing_campaigns FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
  );

-- Update admin policy to also check org membership
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.marketing_campaigns;

CREATE POLICY "Admins can manage campaigns"
  ON public.marketing_campaigns FOR ALL TO authenticated
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('manager')
    )
  )
  WITH CHECK (
    public.is_org_admin(auth.uid(), organization_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_org
  ON public.marketing_campaigns(organization_id);