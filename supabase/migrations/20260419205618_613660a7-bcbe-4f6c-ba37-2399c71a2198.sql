-- Wave 28.7 — Handbook sections couple to policies
ALTER TABLE public.org_handbook_sections
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS policy_ref_id uuid REFERENCES public.policies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS policy_variant_type public.policy_variant_type DEFAULT 'internal';

-- Backfill safety (column default already covers new rows; existing rows get 'custom')
UPDATE public.org_handbook_sections SET source = 'custom' WHERE source IS NULL;

-- Constrain source values
DO $$ BEGIN
  ALTER TABLE public.org_handbook_sections
    ADD CONSTRAINT org_handbook_sections_source_chk
    CHECK (source IN ('policy', 'custom'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Validation: policy-backed sections must reference a policy
CREATE OR REPLACE FUNCTION public.org_handbook_sections_validate_policy_ref()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.source = 'policy' AND NEW.policy_ref_id IS NULL THEN
    RAISE EXCEPTION 'Policy-backed handbook sections require policy_ref_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_handbook_sections_validate_policy_ref ON public.org_handbook_sections;
CREATE TRIGGER trg_org_handbook_sections_validate_policy_ref
  BEFORE INSERT OR UPDATE ON public.org_handbook_sections
  FOR EACH ROW EXECUTE FUNCTION public.org_handbook_sections_validate_policy_ref();

CREATE INDEX IF NOT EXISTS idx_org_handbook_sections_policy_ref
  ON public.org_handbook_sections(policy_ref_id) WHERE policy_ref_id IS NOT NULL;

-- Catalog mapping: policy library_key → handbook section_key
-- This is a deterministic, content-managed lookup. Operators don't edit it directly;
-- doctrine ships the mapping. Static seeds for known coupling.
CREATE TABLE IF NOT EXISTS public.policy_handbook_section_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_library_key text NOT NULL,
  handbook_section_key text NOT NULL,
  variant_type public.policy_variant_type NOT NULL DEFAULT 'internal',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_library_key, handbook_section_key)
);

ALTER TABLE public.policy_handbook_section_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Policy/handbook map readable to authenticated" ON public.policy_handbook_section_map;
CREATE POLICY "Policy/handbook map readable to authenticated"
  ON public.policy_handbook_section_map FOR SELECT
  TO authenticated
  USING (true);

-- Seed the canonical mappings (idempotent via ON CONFLICT)
INSERT INTO public.policy_handbook_section_map (policy_library_key, handbook_section_key, variant_type) VALUES
  ('cancellation_fees', 'attendance_policy', 'internal'),
  ('no_show_policy', 'attendance_policy', 'internal'),
  ('late_arrival', 'attendance_policy', 'internal'),
  ('refund_policy', 'service_guarantees', 'internal'),
  ('redo_policy', 'service_guarantees', 'internal'),
  ('tipping_policy', 'compensation', 'internal'),
  ('commission_structure', 'compensation', 'internal'),
  ('dress_code', 'workplace_conduct', 'internal'),
  ('social_media', 'workplace_conduct', 'internal'),
  ('client_communication', 'workplace_conduct', 'internal'),
  ('color_correction', 'service_standards', 'internal'),
  ('extension_care', 'service_standards', 'internal'),
  ('product_returns', 'retail_operations', 'internal'),
  ('chair_rental', 'booth_rental', 'internal'),
  ('pto_policy', 'time_off', 'internal'),
  ('sick_leave', 'time_off', 'internal'),
  ('shift_swaps', 'scheduling', 'internal'),
  ('overtime_policy', 'scheduling', 'internal')
ON CONFLICT (policy_library_key, handbook_section_key) DO NOTHING;