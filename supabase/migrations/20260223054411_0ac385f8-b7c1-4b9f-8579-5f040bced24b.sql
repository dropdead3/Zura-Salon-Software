
CREATE OR REPLACE FUNCTION public.reevaluate_duplicate_status()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
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
$$;

CREATE TRIGGER reevaluate_duplicate_status_trigger
  BEFORE UPDATE ON public.phorest_clients
  FOR EACH ROW EXECUTE FUNCTION public.reevaluate_duplicate_status();
