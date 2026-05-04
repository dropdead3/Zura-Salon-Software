ALTER TABLE public.client_feedback_responses
  ADD COLUMN IF NOT EXISTS location_id text REFERENCES public.locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cfr_org_location_responded
  ON public.client_feedback_responses(organization_id, location_id, responded_at DESC);

UPDATE public.client_feedback_responses r
   SET location_id = a.location_id
  FROM public.appointments a
 WHERE r.appointment_id = a.id
   AND r.location_id IS NULL
   AND a.location_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_feedback_response_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.location_id IS NULL AND NEW.appointment_id IS NOT NULL THEN
    SELECT a.location_id INTO NEW.location_id
      FROM public.appointments a
     WHERE a.id = NEW.appointment_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_feedback_response_location ON public.client_feedback_responses;
CREATE TRIGGER trg_set_feedback_response_location
  BEFORE INSERT ON public.client_feedback_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_feedback_response_location();