-- Wave 2: Operational Guardrails for services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS patch_test_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS patch_test_validity_days integer NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS start_up_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shut_down_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creation_prompt text,
  ADD COLUMN IF NOT EXISTS checkin_prompt text,
  ADD COLUMN IF NOT EXISTS pos_hotkey text,
  ADD COLUMN IF NOT EXISTS loyalty_points_override integer;

-- Validation trigger: ensure non-negative ranges
CREATE OR REPLACE FUNCTION public.validate_service_operational_guardrails()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.patch_test_validity_days IS NOT NULL AND NEW.patch_test_validity_days < 1 THEN
    RAISE EXCEPTION 'patch_test_validity_days must be >= 1';
  END IF;
  IF NEW.start_up_minutes IS NOT NULL AND NEW.start_up_minutes < 0 THEN
    RAISE EXCEPTION 'start_up_minutes must be >= 0';
  END IF;
  IF NEW.shut_down_minutes IS NOT NULL AND NEW.shut_down_minutes < 0 THEN
    RAISE EXCEPTION 'shut_down_minutes must be >= 0';
  END IF;
  IF NEW.loyalty_points_override IS NOT NULL AND NEW.loyalty_points_override < 0 THEN
    RAISE EXCEPTION 'loyalty_points_override must be >= 0';
  END IF;
  IF NEW.pos_hotkey IS NOT NULL AND length(NEW.pos_hotkey) > 8 THEN
    RAISE EXCEPTION 'pos_hotkey must be 8 characters or fewer';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_service_operational_guardrails_trigger ON public.services;
CREATE TRIGGER validate_service_operational_guardrails_trigger
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_service_operational_guardrails();

-- Patch test records: track per-client per-service patch test events
CREATE TABLE IF NOT EXISTS public.client_patch_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_category text,
  performed_at timestamp with time zone NOT NULL DEFAULT now(),
  performed_by uuid,
  notes text,
  result text NOT NULL DEFAULT 'pass',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_patch_tests_lookup
  ON public.client_patch_tests (organization_id, client_id, performed_at DESC);

ALTER TABLE public.client_patch_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view patch tests" ON public.client_patch_tests;
CREATE POLICY "Org members can view patch tests"
  ON public.client_patch_tests FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org admins can insert patch tests" ON public.client_patch_tests;
CREATE POLICY "Org admins can insert patch tests"
  ON public.client_patch_tests FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org admins can update patch tests" ON public.client_patch_tests;
CREATE POLICY "Org admins can update patch tests"
  ON public.client_patch_tests FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org admins can delete patch tests" ON public.client_patch_tests;
CREATE POLICY "Org admins can delete patch tests"
  ON public.client_patch_tests FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));