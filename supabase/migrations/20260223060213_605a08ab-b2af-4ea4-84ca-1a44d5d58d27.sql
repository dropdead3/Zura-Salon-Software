
-- 1. Create duplicate_dismissals table
CREATE TABLE IF NOT EXISTS public.duplicate_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_a_id UUID NOT NULL REFERENCES public.phorest_clients(id) ON DELETE CASCADE,
  client_b_id UUID NOT NULL REFERENCES public.phorest_clients(id) ON DELETE CASCADE,
  dismissed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_a_id, client_b_id)
);

-- Enable RLS
ALTER TABLE public.duplicate_dismissals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view dismissals"
  ON public.duplicate_dismissals FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create dismissals"
  ON public.duplicate_dismissals FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete dismissals"
  ON public.duplicate_dismissals FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Index for pair lookups
CREATE INDEX IF NOT EXISTS idx_duplicate_dismissals_pair
  ON public.duplicate_dismissals(client_a_id, client_b_id);

CREATE INDEX IF NOT EXISTS idx_duplicate_dismissals_org
  ON public.duplicate_dismissals(organization_id);

-- 2. Update reevaluate_duplicate_status to check dismissals before re-flagging
CREATE OR REPLACE FUNCTION public.reevaluate_duplicate_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip if no identity fields changed
  IF OLD.email_normalized IS NOT DISTINCT FROM NEW.email_normalized
     AND OLD.phone_normalized IS NOT DISTINCT FROM NEW.phone_normalized THEN
    RETURN NEW;
  END IF;

  -- Case 1: This record is a duplicate -- check if it still matches its canonical
  IF NEW.is_duplicate = true AND NEW.canonical_client_id IS NOT NULL THEN
    PERFORM 1 FROM phorest_clients c
    WHERE c.id = NEW.canonical_client_id
      AND (
        (NEW.email_normalized IS NOT NULL AND c.email_normalized = NEW.email_normalized)
        OR
        (NEW.phone_normalized IS NOT NULL AND c.phone_normalized = NEW.phone_normalized)
      );
    IF NOT FOUND THEN
      NEW.is_duplicate := false;
      NEW.canonical_client_id := NULL;
    END IF;
  END IF;

  -- Case 2: This record is a canonical -- clear orphaned duplicates
  -- But also check dismissals: don't re-flag pairs that were dismissed
  IF NEW.is_duplicate = false THEN
    UPDATE phorest_clients dup
    SET is_duplicate = false, canonical_client_id = NULL
    WHERE dup.canonical_client_id = NEW.id
      AND dup.is_duplicate = true
      AND NOT (
        (dup.email_normalized IS NOT NULL AND NEW.email_normalized IS NOT NULL
         AND dup.email_normalized = NEW.email_normalized)
        OR
        (dup.phone_normalized IS NOT NULL AND NEW.phone_normalized IS NOT NULL
         AND dup.phone_normalized = NEW.phone_normalized)
      );
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Update find_duplicate_phorest_clients to exclude dismissed pairs
CREATE OR REPLACE FUNCTION public.find_duplicate_phorest_clients(p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_exclude_phorest_client_id text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, phorest_client_id text, name text, email text, phone text, match_type text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email_norm TEXT;
  v_phone_norm TEXT;
BEGIN
  -- Normalize inputs
  IF p_email IS NOT NULL AND p_email != '' THEN
    v_email_norm := lower(trim(p_email));
  END IF;

  IF p_phone IS NOT NULL AND p_phone != '' THEN
    v_phone_norm := regexp_replace(p_phone, '[^0-9+]', '', 'g');
    IF length(v_phone_norm) = 10 AND left(v_phone_norm, 1) != '+' THEN
      v_phone_norm := '+1' || v_phone_norm;
    ELSIF length(v_phone_norm) = 11 AND left(v_phone_norm, 1) = '1' THEN
      v_phone_norm := '+' || v_phone_norm;
    END IF;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    c.id,
    c.phorest_client_id,
    c.name,
    c.email,
    c.phone,
    CASE
      WHEN v_email_norm IS NOT NULL AND c.email_normalized = v_email_norm THEN 'email'
      WHEN v_phone_norm IS NOT NULL AND c.phone_normalized = v_phone_norm THEN 'phone'
      ELSE 'unknown'
    END AS match_type
  FROM public.phorest_clients c
  WHERE c.is_duplicate = false
    AND (p_exclude_phorest_client_id IS NULL OR c.phorest_client_id != p_exclude_phorest_client_id)
    AND (
      (v_email_norm IS NOT NULL AND c.email_normalized = v_email_norm)
      OR
      (v_phone_norm IS NOT NULL AND c.phone_normalized = v_phone_norm)
    )
    -- Exclude pairs that have been dismissed
    AND NOT EXISTS (
      SELECT 1 FROM public.duplicate_dismissals dd
      WHERE (dd.client_a_id = c.id OR dd.client_b_id = c.id)
    );
END;
$function$;
