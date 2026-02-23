
-- Create client_households table
CREATE TABLE IF NOT EXISTS public.client_households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  household_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.client_households ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_households
CREATE POLICY "Org members can view households"
  ON public.client_households FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create households"
  ON public.client_households FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update households"
  ON public.client_households FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete households"
  ON public.client_households FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_client_households_updated_at
  BEFORE UPDATE ON public.client_households
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX IF NOT EXISTS idx_client_households_org
  ON public.client_households(organization_id);

-- Create client_household_members table
CREATE TABLE IF NOT EXISTS public.client_household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.client_households(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.phorest_clients(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, client_id),
  UNIQUE(client_id) -- a client can only belong to one household
);

-- Enable RLS
ALTER TABLE public.client_household_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_household_members (inherit org scope from parent)
CREATE POLICY "Org members can view household members"
  ON public.client_household_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.client_households h
    WHERE h.id = household_id
    AND public.is_org_member(auth.uid(), h.organization_id)
  ));

CREATE POLICY "Org admins can add household members"
  ON public.client_household_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.client_households h
    WHERE h.id = household_id
    AND public.is_org_admin(auth.uid(), h.organization_id)
  ));

CREATE POLICY "Org admins can remove household members"
  ON public.client_household_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.client_households h
    WHERE h.id = household_id
    AND public.is_org_admin(auth.uid(), h.organization_id)
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_household_members_household
  ON public.client_household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_client_household_members_client
  ON public.client_household_members(client_id);

-- Update find_duplicate_phorest_clients to also exclude household members
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
    )
    -- Exclude clients already in a household together
    AND NOT EXISTS (
      SELECT 1 FROM public.client_household_members chm
      WHERE chm.client_id = c.id
    );
END;
$function$;
