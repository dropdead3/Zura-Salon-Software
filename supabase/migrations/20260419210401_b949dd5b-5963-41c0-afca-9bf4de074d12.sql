-- Wave 28.8 — Public read access for approved client-facing policy variants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'policies' AND policyname = 'Public can view approved client-facing policies'
  ) THEN
    CREATE POLICY "Public can view approved client-facing policies"
      ON public.policies FOR SELECT
      TO anon, authenticated
      USING (
        status IN ('approved_internal', 'published_external', 'wired')
        AND audience IN ('external', 'both')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'policy_versions' AND policyname = 'Public can view published policy versions'
  ) THEN
    CREATE POLICY "Public can view published policy versions"
      ON public.policy_versions FOR SELECT
      TO anon, authenticated
      USING (
        is_published_external = true
        AND EXISTS (
          SELECT 1 FROM public.policies p
          WHERE p.id = policy_versions.policy_id
            AND p.current_version_id = policy_versions.id
            AND p.status IN ('approved_internal', 'published_external', 'wired')
            AND p.audience IN ('external', 'both')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'policy_variants' AND policyname = 'Public can view approved client variants'
  ) THEN
    CREATE POLICY "Public can view approved client variants"
      ON public.policy_variants FOR SELECT
      TO anon, authenticated
      USING (
        variant_type = 'client'
        AND approved = true
        AND EXISTS (
          SELECT 1 FROM public.policy_versions pv
          JOIN public.policies p ON p.id = pv.policy_id
          WHERE pv.id = policy_variants.version_id
            AND p.current_version_id = pv.id
            AND pv.is_published_external = true
            AND p.status IN ('approved_internal', 'published_external', 'wired')
            AND p.audience IN ('external', 'both')
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_policy_variants_public_lookup
  ON public.policy_variants(version_id, variant_type, approved);