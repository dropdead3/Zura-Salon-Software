
-- Add normalized identity columns to phorest_clients
ALTER TABLE public.phorest_clients
  ADD COLUMN IF NOT EXISTS email_normalized TEXT,
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT,
  ADD COLUMN IF NOT EXISTS canonical_client_id UUID REFERENCES public.phorest_clients(id),
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_phorest_clients_email_normalized
  ON public.phorest_clients(email_normalized) WHERE email_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_phorest_clients_phone_normalized
  ON public.phorest_clients(phone_normalized) WHERE phone_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_phorest_clients_is_duplicate
  ON public.phorest_clients(is_duplicate) WHERE is_duplicate = false;

CREATE INDEX IF NOT EXISTS idx_phorest_clients_canonical
  ON public.phorest_clients(canonical_client_id) WHERE canonical_client_id IS NOT NULL;

-- Create normalization trigger for phorest_clients
CREATE OR REPLACE FUNCTION public.normalize_phorest_client_identity()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Normalize email: lowercase + trim
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    NEW.email_normalized := lower(trim(NEW.email));
  ELSE
    NEW.email_normalized := NULL;
  END IF;

  -- Normalize phone: strip non-digits, ensure +1 prefix for US
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.phone_normalized := regexp_replace(NEW.phone, '[^0-9+]', '', 'g');
    IF length(NEW.phone_normalized) = 10 AND left(NEW.phone_normalized, 1) != '+' THEN
      NEW.phone_normalized := '+1' || NEW.phone_normalized;
    ELSIF length(NEW.phone_normalized) = 11 AND left(NEW.phone_normalized, 1) = '1' THEN
      NEW.phone_normalized := '+' || NEW.phone_normalized;
    END IF;
  ELSE
    NEW.phone_normalized := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER normalize_phorest_client_identity_trigger
  BEFORE INSERT OR UPDATE ON public.phorest_clients
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phorest_client_identity();

-- Backfill existing rows
UPDATE public.phorest_clients
SET
  email_normalized = CASE WHEN email IS NOT NULL AND email != '' THEN lower(trim(email)) ELSE NULL END,
  phone_normalized = CASE
    WHEN phone IS NOT NULL AND phone != '' THEN
      CASE
        WHEN length(regexp_replace(phone, '[^0-9+]', '', 'g')) = 10
             AND left(regexp_replace(phone, '[^0-9+]', '', 'g'), 1) != '+'
          THEN '+1' || regexp_replace(phone, '[^0-9+]', '', 'g')
        WHEN length(regexp_replace(phone, '[^0-9+]', '', 'g')) = 11
             AND left(regexp_replace(phone, '[^0-9+]', '', 'g'), 1) = '1'
          THEN '+' || regexp_replace(phone, '[^0-9+]', '', 'g')
        ELSE regexp_replace(phone, '[^0-9+]', '', 'g')
      END
    ELSE NULL
  END
WHERE email_normalized IS NULL AND phone_normalized IS NULL;

-- Create find_duplicate_phorest_clients function
CREATE OR REPLACE FUNCTION public.find_duplicate_phorest_clients(
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_exclude_phorest_client_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  phorest_client_id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  match_type TEXT
)
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
    );
END;
$function$;
